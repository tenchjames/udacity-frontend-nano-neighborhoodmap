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

var locations = [];
var markers = [];
var infoWindows = [];
var FOUR_SQUARE_URL = 'https://api.foursquare.com/v2/venues/';
var FOUR_SQUARE_CLIENT_ID = '5HFALNIUYZ31OHEDLIQZWPNQCE2ODS5ZSA2TCD3D0MRNXQVA';
var FOUR_SQUARE_CLIENT_SECRET = 'ECISSMB3KL5V1S4H31SLVNUEUJAQH43EHNUPAFDOZIMOW512';
var FOUR_SQUARE_VERSION = '20150110';
var FOUR_SQUARE_M = 'foursquare';

/* google maps functions */
var map;
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
      
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById('locationListContainer'));

    var input = document.getElementById('pac-input');
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(document.getElementById('searchContainer'));
    var searchBox = new google.maps.places.SearchBox(input, autoCompleteOptions);

    // TODO: MOVE THIS INTO ANOTHER OBJECT...JUST TESTING
    google.maps.event.addListener(searchBox, 'places_changed', function() {
        var places = searchBox.getPlaces();
        if (places.length === 0) {
            return;
        }
        var marker, place;
        for (var i = 0; i < markers.length; i++) {
            marker = markers[i];
            marker.setMap(null);
        }

        markers = [];
        var bounds = new google.maps.LatLngBounds();
        for (i = 0; i < places.length; i++) {
            place = places[i];
              var image = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25)
              };

              // Create a marker for each place.
              marker = new google.maps.Marker({
                map: map,
                icon: image,
                title: place.name,
                position: place.geometry.location
              });

              markers.push(marker);

              bounds.extend(place.geometry.location);
        }
        map.fitBounds(bounds);
    });

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
        return '<div class="locationName"><h4>' + this.locationName() + '</h4></div>';
    }, this);

    this.fourSquarePrimaryCategoryDiv = ko.computed(function() {
        return '<div class="primaryCategoryContainer"><p>Category: <span class="primaryCategory">' + this.fourSquarePrimaryCategory() + '</span></p></div>';
    }, this);

    this.vicinityDiv = ko.computed(function() {
        return  '<div class="locationVicinity"><p>Address: <span class="address">' + this.vicinity() + '</span></p></div>';
    }, this);

    this.fourSquareHereNowDiv = ko.computed(function() {
        return '<div class="hereNowContainer"><p>Here now: <span class="hereNow">' + this.fourSquareHereNowSummary() + '</span></p></div>';
    },this);

    this.fourSquareCheckInCountDiv = ko.computed(function() {
        return '<div class="checkInCountContainer"><p>FourSquare checkins: <span class="haveCheckedIn">' + this.fourSquareCheckInCount() + '</span></p></div>';
    }, this);


    this.infoWindowDiv = ko.computed(function(){
        if (this.fourSquareError().length > 0) {
            return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.vicinityDiv() + this.fourSquareError() + '</div>';
        } else {
            return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.fourSquarePrimaryCategoryDiv() + this.vicinityDiv() + this.fourSquareHereNowDiv() + this.fourSquareCheckInCountDiv() + '</div>';
        }
    }, this);


    this.searchForPlaceMarker(loc);
};

NeighborhoodLocation.prototype = {
    createMapMarker: function(placesData) {
        var self = this;
        if (placesData[0].vicinity) {
            self.vicinity(placesData[0].vicinity.split(',')[0]);
        }
        this.latitude = placesData[0].geometry.location.lat();
        this.longitude = placesData[0].geometry.location.lng();
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
        var service = new google.maps.places.PlacesService(map);
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
            this.createMapMarker(results);
        }        
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
    self.allLocations = ko.observableArray(locations);

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
        self.allLocations().push(new NeighborhoodLocation(initialLocations[i]));
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
    };

    self.closeInfoWindows = function() {
        var nInfoWindows = infoWindows.length;
        for (var i = 0; i < nInfoWindows; i += 1) {
            infoWindows[i].close();
        }
    };

    self.setCurrentLocation(self.allLocations()[0]);

};

google.maps.event.addDomListener(window, 'load', initMap(downtownNashville));

ko.applyBindings(ViewModel);
