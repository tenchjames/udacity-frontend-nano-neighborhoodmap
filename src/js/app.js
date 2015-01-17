var initialLocations = [
    {
        locationTypes: ["lodging"],
        locationName: "Courtyard Nashville Downtown"
    },
    {
        locationTypes: ["bar", "night_club"],
        locationName: "The Stage on Broadway"
    },
    {
        locationTypes: ["bar", "night_club"],
        locationName: "Tootsies Orchid Lounge"
    },
    {
        locationTypes: ["bar", "night_club"],
        locationName: "Tequila Cowboy"
    },
    {
        locationTypes: ["food", "bar", "restaurant"],
        locationName: "Rock Bottom Nashville"        
    }
];


var infoWindows = [];
var FOUR_SQUARE_URL = 'https://api.foursquare.com/v2/venues/';
var FOUR_SQUARE_CLIENT_ID = '5HFALNIUYZ31OHEDLIQZWPNQCE2ODS5ZSA2TCD3D0MRNXQVA';
var FOUR_SQUARE_CLIENT_SECRET = 'ECISSMB3KL5V1S4H31SLVNUEUJAQH43EHNUPAFDOZIMOW512';
var FOUR_SQUARE_VERSION = '20150110';
var FOUR_SQUARE_M = 'foursquare';

/* google maps functions */
var map, sv, panorama, service, searchBox;
var downtownNashville = new google.maps.LatLng(36.1606405, -86.7762455);
var initMap = function(focalPoint) {
    var mapOptions = {
        center: focalPoint,
        zoom: 16,
        disableDefaultUI: true
    };

    var defaultBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(35.1606405, -87.7762455),
        new google.maps.LatLng(37.1606405, -85.7762455));

    var autoCompleteOptions = {
        bounds: defaultBounds
    };
    // create the map
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    // create the search service
    service = new google.maps.places.PlacesService(map);

    map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById('locationListContainer'));


    // search box
    var input = document.getElementById('pac-input');
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(document.getElementById('searchContainer'));

    // create the search box functionality with autocomplete
    searchBox = new google.maps.places.SearchBox(input, autoCompleteOptions);

    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById("pano"));

    // create the street view service
    sv = new google.maps.StreetViewService();

    // default pano image
    var panoramaOptions = {
            position: downtownNashville,
            pov: {
                heading: 90,
                pitch: 0
            }
        };

    // add the initial pano image to the pano
    panorama = new  google.maps.StreetViewPanorama(document.getElementById("pano"), panoramaOptions);
    map.setStreetView(panorama); 

};
    


var NeighborhoodLocation = function(loc) {
    var self = this;
    this.markerOpen = ko.observable(false);
    this.receivedFourSquareUpdate = ko.observable(false);
    this.locationTypes = ko.observableArray(loc.locationTypes);
    this.locationName = ko.observable(loc.locationName);
    this.formattedAddress = ko.observable(loc.formattedAddress);
    this.vicinity = ko.observable();
    this.latitude = "";
    this.longitude = "";
    // four square properties to add to the info window
    this.fourSquareHereNowSummary = ko.observable('');
    this.fourSquarePrimaryCategory = ko.observable('');
    this.fourSquareCheckInCount = ko.observable('');
    this.fourSquareError = ko.observable('');

    this.locationNameDiv = ko.computed(function() {
        return '<div class="infoWindowSection"><h4>' + this.locationName() + '</h4></div>';
    }, this);

    this.fourSquarePrimaryCategoryDiv = ko.computed(function() {
        return '<div class="infoWindowSection"><p>Category: <span class="primaryCategory">' + this.fourSquarePrimaryCategory() + '</span></p></div>';
    }, this);

    this.vicinityDiv = ko.computed(function() {
        return  '<div class="infoWindowSection"><p>Address: <span class="address">' + this.vicinity() + '</span></p></div>';
    }, this);

    this.fourSquareHereNowDiv = ko.computed(function() {
        var hereClass = 'hereNow';
        if (this.fourSquareHereNowSummary() === 'Nobody here') {
            hereClass = 'nobodyHereNow';
        }
        return '<div class="infoWindowSection"><p>Here now: <span class="' + hereClass + '">' + this.fourSquareHereNowSummary() + '</span></p></div>';
    },this);

    this.fourSquareCheckInCountDiv = ko.computed(function() {
        return '<div class="infoWindowSection"><p>Foursquare checkins: <span class="haveCheckedIn">' + this.fourSquareCheckInCount() + '</span></p></div>';
    }, this);


    this.infoWindowDiv = ko.computed(function(){
        if (this.fourSquareError().length > 0) {
            return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.vicinityDiv() + this.fourSquareError() + '</div>';
        } else {
            return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.fourSquarePrimaryCategoryDiv() + this.vicinityDiv() + this.fourSquareHereNowDiv() + this.fourSquareCheckInCountDiv() + '</div>';
        }
    }, this);
    
};

NeighborhoodLocation.prototype = {
    init: function() {
        var location = {locationName: this.locationName(), locationTypes: this.locationTypes()};
        this.searchForPlaceMarker(location);
    },
    createMapMarker: function(placesData) {
        var self = this;
        if (placesData[0].vicinity !== undefined) {
            self.vicinity(placesData[0].vicinity.split(',')[0]);
        }
        this.latitude = placesData[0].geometry.location.lat();
        this.longitude = placesData[0].geometry.location.lng();
        this.geometryLocation = placesData[0].geometry.location;
        self.marker = new google.maps.Marker({
            map: map,
            position: placesData[0].geometry.location,
            title: placesData[0].name
        });
        self.infoWindow = new google.maps.InfoWindow({
            content: self.infoWindowDiv()
        });
        infoWindows.push(self.infoWindow);
        google.maps.event.addListener(self.marker, 'click', function() {
            self.markerOpen(!self.markerOpen());
        });

        // now that we have a marker location, let's us that data to get 
        // foursquare set up
        self.setFourSquareInfo();
    },
    searchForPlaceMarker: function(location) {
        var request = {};
        request.location = downtownNashville;
        request.radius = 1200;

        if (location.locationKeyword && location.locationKeyword !== "") {
            request.keyword = location.locationKeyword;
        }
        if (location.locationName && location.locationName !== "") {
            request.name = location.locationName;
        }
        if (location.locationTypes && location.locationTypes.length > 0) {
            request.type = location.locationTypes;
        } 
        service.nearbySearch(request, this.addPlaceCallback.bind(this));      
    },
    addPlaceCallback: function(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            this.addPlace(results);
        }        
    },
    addPlace: function(placeData) {
        // use google data if available
        if (placeData.name !== undefined) {
            this.locationName = placeData.name;
        }
        if (placeData.types !== undefined && placeData.types > 0) {
            this.locationTypes = placeData.types;
        }
        this.createMapMarker(placeData);       
    },
    getFourSquareInfo: function() {
        return $.ajax({
            url: FOUR_SQUARE_URL + 'search',
            type: 'GET',
            dataType: 'jsonp',
            contentType: 'application/json',
            data: {
                client_id: FOUR_SQUARE_CLIENT_ID,
                client_secret: FOUR_SQUARE_CLIENT_SECRET,
                ll: this.latitude + ',' + this.longitude,
                query: this.locationName(),
                radius: 50,
                v: FOUR_SQUARE_VERSION,
                m: FOUR_SQUARE_M
            }
        });
    },
    setFourSquareInfo: function() {
        var self = this;
        self.getFourSquareInfo().done(function(data) {
            var venues = data.response.venues;
            var idx = 0; // default to the first item if not better match
            var maxAddrMatch = 0;
            var currentMatch = 0;
            var googleVicinity = self.vicinity().split('');
            var fSquareAddress = [];
            var i, j;
            // let's do some matching on the address. Closest match wins
            if (venues.length > 1) {
                for (i = 0; i < venues.length; i += 1) {
                    if (venues[i].location !== undefined && venues[i].location.address !== undefined) {
                        fSquareAddress = venues[i].location.address.split('');  
                    } else {
                        fSquareAddress = '';
                    }
                    currentMatch = 0;
                    for (j = 0; j < googleVicinity.length && j < fSquareAddress.length; j += 1) {
                        if (googleVicinity[j] !== fSquareAddress[j]) {
                            break;
                        } else {
                            currentMatch += 1;
                        }
                    }
                    if (currentMatch > maxAddrMatch) {
                        idx = i;
                        maxAddrMatch = currentMatch;
                    }
                }
            }

            if (venues[idx].hereNow.summary !== undefined) {
                self.fourSquareHereNowSummary(venues[idx].hereNow.summary);    
            } else {
                self.fourSquareHereNowSummary('Data unavailable from Foursquare');
            }

            if (venues[idx].stats.checkinsCount !== undefined) {
                self.fourSquareCheckInCount(venues[idx].stats.checkinsCount);   
            } else {
                self.fourSquareCheckInCount('Data unavailable from Foursquare');
            }            

            if (venues[idx].categories !== undefined && venues[idx].categories.length > 0) {
                // find primary category
                for (i = 0; i < venues[idx].categories.length; i += 1) {
                    // api says if there are categories, then one will be listed as the primary
                    if (venues[idx].categories[i].primary === true) {
                        self.fourSquarePrimaryCategory(venues[idx].categories[i].name);
                        break;
                    }
                }  
            } else {
                self.fourSquarePrimaryCategory('Data unavailable from Foursquare');
            }

            // so subscribers know to perform updates
            self.receivedFourSquareUpdate(true);
        }).fail(function(jqXHR, textStatus) {
            self.fourSquareError('<span class="error">' + 'Error getting data from Foursquare, please be sure you are connected to the internet' + '</span>');
            self.fourSquareCheckInCount('');
            self.fourSquarePrimaryCategory('');
            self.fourSquareHereNowSummary('');
            self.receivedFourSquareUpdate(true);
        });
    }
};


var ViewModel = function() {
    var self = this;
    self.allLocations = ko.observableArray([]);

    self.subscribeToMapClick = function(location) {
        location.markerOpen.subscribe(function(markerOpen) {
            if (markerOpen) {
                self.setCurrentLocation(location);
            }
        });
    };

    self.subscribeToFourSquareUpdate = function(location) {
        location.receivedFourSquareUpdate.subscribe(function(receivedFourSquareUpdate) {
            if (receivedFourSquareUpdate && location.infoWindow) {
                location.infoWindow.setContent(self.currentLocation().infoWindowDiv());
                receivedFourSquareUpdate = true;
            }            
        });
    };

    for (var i = 0; i < initialLocations.length; i += 1) {
        var currentLocation = new NeighborhoodLocation(initialLocations[i]);
        currentLocation.init();
        self.allLocations.push(currentLocation);
        self.subscribeToMapClick(self.allLocations()[i]);
        self.subscribeToFourSquareUpdate(self.allLocations()[i]);
    }
    self.currentLocation = ko.observable();

    self.setCurrentLocation = function(location) {
        self.closeInfoWindows();
        self.currentLocation(location);
        if (location.infoWindow) {
            location.infoWindow.open(map,location.marker);
            location.infoWindow.setContent(self.currentLocation().infoWindowDiv());              
        }
        if (location.geometryLocation) {
            sv.getPanoramaByLocation(location.geometryLocation, 50, self.processSVData.bind(self));   
        }
        
    };

    self.processSVData = function(data, status) {
        if (status === google.maps.StreetViewStatus.OK) {
            panorama.setPano(data.location.pano);
            var heading = google.maps.geometry.spherical.computeHeading(data.location.latLng, self.currentLocation().geometryLocation);
            panorama.setPov({
                heading: heading,
                pitch: 0
            });
            panorama.setVisible(true);
        } else {
            $('#pano').html('Error getting pano image');
        }
    };

    self.closeInfoWindows = function() {
        var nInfoWindows = infoWindows.length;
        for (var i = 0; i < nInfoWindows; i += 1) {
            infoWindows[i].close();
        }
    };

    self.addPlace = function(location) {
        self.allLocations.push(location);
    };


    google.maps.event.addListener(searchBox, 'places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length === 0) {
            return;
        }
        var newLocation = new NeighborhoodLocation({locationName: places[0].name, locationTypes: places[0].types});
        newLocation.init();
        self.allLocations.push(newLocation);
        self.subscribeToMapClick(newLocation);
        self.subscribeToFourSquareUpdate(newLocation);
                     
    }); 
    self.setCurrentLocation(self.allLocations()[0]);

};

google.maps.event.addDomListener(window, 'load', initMap(downtownNashville));

setTimeout(function() {
    ko.applyBindings(new ViewModel());
}, 2000);

