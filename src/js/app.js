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

/* Info needed for Foursquare api */
var FOUR_SQUARE_URL = 'https://api.foursquare.com/v2/venues/';
var FOUR_SQUARE_CLIENT_ID = '5HFALNIUYZ31OHEDLIQZWPNQCE2ODS5ZSA2TCD3D0MRNXQVA';
var FOUR_SQUARE_CLIENT_SECRET = 'ECISSMB3KL5V1S4H31SLVNUEUJAQH43EHNUPAFDOZIMOW512';
var FOUR_SQUARE_VERSION = '20150110';
var FOUR_SQUARE_M = 'foursquare';

/* google maps functions */
var map, sv, panorama, service, searchBox;
/* the location we are touring, for this may it's Nashville TN */
var downtownNashville = new google.maps.LatLng(36.1606405, -86.7762455);
var initMap = function (focalPoint) {
    var mapOptions = {
        center: focalPoint,
        zoom: 16,
        disableDefaultUI: true
    };
    /* set small area around Nashville */
    var defaultBounds = new google.maps.LatLngBounds(new google.maps.LatLng(35.1606405, -87.7762455), new google.maps.LatLng(37.1606405, -85.7762455));

    /* Keep search preference to this area */
    var autoCompleteOptions = {
        bounds: defaultBounds
    };
    /* Create new google map */
    map = new google.maps.Map(document.getElementById('map'), mapOptions);

    /* Places service for looking up locations */
    service = new google.maps.places.PlacesService(map);

    /* This is a selectable list of locations on the map */
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(document.getElementById('locationListContainer'));

    /* Search input for google Search API */
    var input = document.getElementById('pac-input');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(document.getElementById('searchContainer'));

    /* this actually creates the searchbox object */
    searchBox = new google.maps.places.SearchBox(input, autoCompleteOptions);

    /* Google StreetView API panoramic images will be placed here */
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById("pano"));

    /* Initialize the street view service */
    sv = new google.maps.StreetViewService();

    /* Default the panoramic image to downtown Nashville */
    var panoramaOptions = {
            position: downtownNashville,
            pov: {
                heading: 90,
                pitch: 0
            }
        };

    /* Adds the panorama object to the page */
    panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), panoramaOptions);
    map.setStreetView(panorama);
};

/*
 * This is the primary model opbject we will use for neighborhood locations
 */
var NeighborhoodLocation = function (loc) {
    this.markerOpen = ko.observable(false);
    this.receivedFourSquareUpdate = ko.observable(false);
    this.locationTypes = ko.observableArray(loc.locationTypes);
    this.locationName = ko.observable(loc.locationName);
    this.formattedAddress = ko.observable(loc.formattedAddress);
    this.vicinity = ko.observable();
    this.latitude = "";
    this.longitude = "";
    this.panoRadius = 10; // use this to find closest possible image

    // four square properties to add to the info window
    this.fourSquareHereNowSummary = ko.observable('');
    this.fourSquarePrimaryCategory = ko.observable('');
    this.fourSquareCheckInCount = ko.observable('');
    this.fourSquareError = ko.observable('');

    /* InfoWiindo divs that are built with ko.computed values */
    this.locationNameDiv = ko.computed(function () {
        if (!this.locationName() || this.locationName() === "") {
            return '<div class="infoWindowSection"><h4>Getting Foursquare data...</h4></div>';
        }
        return '<div class="infoWindowSection"><h4>' + this.locationName() + '</h4></div>';
    }, this);

    this.fourSquarePrimaryCategoryDiv = ko.computed(function () {
        return '<div class="infoWindowSection"><p>Category: <span class="primaryCategory">' + this.fourSquarePrimaryCategory() + '</span></p></div>';
    }, this);

    this.vicinityDiv = ko.computed(function () {
        return '<div class="infoWindowSection"><p>Address: <span class="address">' + this.vicinity() + '</span></p></div>';
    }, this);

    this.fourSquareHereNowDiv = ko.computed(function () {
        var hereClass = 'hereNow';
        if (this.fourSquareHereNowSummary() === 'Nobody here') {
            hereClass = 'nobodyHereNow';
        }
        return '<div class="infoWindowSection"><p>Here now: <span class="' + hereClass + '">' + this.fourSquareHereNowSummary() + '</span></p></div>';
    }, this);

    this.fourSquareCheckInCountDiv = ko.computed(function () {
        return '<div class="infoWindowSection"><p>Foursquare checkins: <span class="haveCheckedIn">' + this.fourSquareCheckInCount() + '</span></p></div>';
    }, this);


    this.infoWindowDiv = ko.computed(function () {
        if (this.fourSquareError().length > 0) {
            return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.vicinityDiv() + this.fourSquareError() + '</div>';
        }
        return '<div class="infoWindowContainer">' + this.locationNameDiv() + this.fourSquarePrimaryCategoryDiv() + this.vicinityDiv() + this.fourSquareHereNowDiv() + this.fourSquareCheckInCountDiv() + '</div>';
    }, this);
};
/* functions that work on the object
 * most of the object is built up by accessing
 * Google Places API and/or FourSquare API
 */
NeighborhoodLocation.prototype = {
    init: function () {
        var location = {locationName: this.locationName(), locationTypes: this.locationTypes()};
        this.searchForPlaceMarker(location);
        this.infoWindow = new google.maps.InfoWindow({
            content: this.infoWindowDiv()
        });
    },
    createMapMarker: function (placesData) {
        var self = this;
        // if google has vicinity, use the address to get best foursquare match later
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
        // use custom icons if available
        if (placesData[0].icon !== undefined) {
            var icon = new google.maps.MarkerImage(placesData[0].icon, null, null, null, new google.maps.Size(25, 25));
            self.marker.setIcon(icon);
        }
        google.maps.event.addListener(self.marker, 'click', function () {
            self.markerOpen(!self.markerOpen()); // will subsribe to the status to fire events later
        });

        // if someone was waiting to open the infoWindow, open it now
        if (self.markerOpen()) {
            self.infoWindow.open(map, self.marker);
        }

        // use info from object and google places to get Foursquare info
        self.setFourSquareInfo();
    },
    searchForPlaceMarker: function (location) {
        var request = {};
        request.location = downtownNashville;
        request.radius = 1200; // limit tour to local area

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
    addPlaceCallback: function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            this.addPlace(results);
        } else {
            this.locationName = "Error getting google places data, please check your internet connection and try again";
        }
    },
    addPlace: function (placeData) {
        // use google data if available
        if (placeData.name !== undefined) {
            this.locationName = placeData.name;
        }
        if (placeData.types !== undefined && placeData.types > 0) {
            this.locationTypes = placeData.types;
        }
        this.createMapMarker(placeData);
    },
    getFourSquareInfo: function () {
        // returns a promise so we can continue async
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
    setFourSquareInfo: function () {
        var self = this;
        self.getFourSquareInfo().done(function (data) {
            var venues = data.response.venues;
            // variables used in matching algorithm
            // default to 0 if we cant get a better match
            var idx = 0;
            var maxAddrMatch = 0;
            var currentMatch = 0;
            var googleVicinity = self.vicinity().split('');
            var fSquareAddress = [];
            var i, j;
            // let's do some matching on the address. Closest match wins
            // compare the Foursquare address to the google places vicinity property
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
                        }
                        currentMatch += 1;
                    }
                    if (currentMatch > maxAddrMatch) {
                        idx = i;
                        maxAddrMatch = currentMatch;
                    }
                }
            }
            // Use Foursquare data if available
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
        }).fail(function () {
            self.fourSquareError('<span class="error">' + 'Error getting data from Foursquare, please be sure you are connected to the internet' + '</span>');
            self.fourSquareCheckInCount('');
            self.fourSquarePrimaryCategory('');
            self.fourSquareHereNowSummary('');
            self.receivedFourSquareUpdate(true);
        });
    }
};


var ViewModel = function () {
    var self = this,
        i;
    self.allLocations = ko.observableArray([]);

    /* when a marker is clicked, update the current location in the ViewModel */
    self.subscribeToMapClick = function (location) {
        location.markerOpen.subscribe(function (markerOpen) {
            if (markerOpen) {
                self.setCurrentLocation(location);
            } else {
                self.closeInfoWindow(location);
            }
        });
    };

    /* Allows the InfoWindow Div to get updates when Foursquare data is returned */
    self.subscribeToFourSquareUpdate = function (location) {
        location.receivedFourSquareUpdate.subscribe(function (receivedFourSquareUpdate) {
            if (receivedFourSquareUpdate && location.infoWindow) {
                location.infoWindow.setContent(location.infoWindowDiv());
                // this also means we have updated geo data, update the pano image
                if (location.markerOpen()) {
                    self.getPanoramaImage();
                }
            }
        });
    };

    self.deletePlace = function (location) {
        if (location.marker !== undefined) {
            location.marker.setMap(null);
        }
        self.allLocations.remove(location);
    };

    /* pushes new location and adds subscriptions above */
    self.addPlace = function (location) {
        self.allLocations.push(location);
        self.subscribeToMapClick(location);
        self.subscribeToFourSquareUpdate(location);
        location.markerOpen(true);
    };

    /* We only keep one window open at a time */
    self.closeInfoWindows = function () {
        var nInfoWindows = self.allLocations().length;
        for (i = 0; i < nInfoWindows; i += 1) {
            if (self.allLocations()[i].infoWindow && self.allLocations()[i] !== self.currentLocation()) {
                self.allLocations()[i].markerOpen(false); // will cause individual windows subscribed to close infoWindows
            }
        }
    };

    self.closeInfoWindow = function (location) {
        if (location.infoWindow && !location.markerOpen()) {
            location.infoWindow.close();
        }
    };

    self.currentLocation = ko.observable();

    self.setCurrentLocation = function (location) {
        self.currentLocation(location);
        self.closeInfoWindows();
        /* test to make sure this has been initialized yet from the ajax call*/
        if (location.infoWindow !== undefined && location.marker !== undefined) {
            location.infoWindow.setContent(self.currentLocation().infoWindowDiv());
            location.infoWindow.open(map, location.marker);
        }
        /* test to make sure this has been initialized yet from the ajax call*/
        if (location.geometryLocation) {
            self.getPanoramaImage();
        }
    };

    self.toggleInfoWindow = function (location) {
        location.markerOpen(!location.markerOpen());
    };

    self.getPanoramaImage = function () {
        sv.getPanoramaByLocation(self.currentLocation().geometryLocation, self.currentLocation().panoRadius, self.processSVData);
    };

    /* searches for the closest panoramic image available */
    self.processSVData = function (data, status) {
        if (status === google.maps.StreetViewStatus.OK) {
            $('#panoError').removeClass('unhide');
            panorama.setPano(data.location.pano);
            var heading = google.maps.geometry.spherical.computeHeading(data.location.latLng, self.currentLocation().geometryLocation);
            panorama.setPov({
                heading: heading,
                pitch: 0
            });
            panorama.setVisible(true);
        } else if (status === google.maps.StreetViewStatus.ZERO_RESULTS) {
            /* increase the radius needed to search for this pano */
            self.currentLocation().panoRadius += 40;
            self.getPanoramaImage();
        } else {
            $('#panoError').addClass('unhide');
        }
    };

    var currentLocation;
    for (i = 0; i < initialLocations.length; i += 1) {
        currentLocation = new NeighborhoodLocation(initialLocations[i]);
        currentLocation.init();
        self.allLocations.push(currentLocation);
        self.subscribeToMapClick(currentLocation);
        self.subscribeToFourSquareUpdate(currentLocation);
    }

    google.maps.event.addListener(searchBox, 'places_changed', function () {
        var places = searchBox.getPlaces();
        if (places.length === 0) {
            return;
        }
        var newLocation = new NeighborhoodLocation({locationName: places[0].name, locationTypes: places[0].types});
        newLocation.init();
        self.addPlace(newLocation);
    });
    self.setCurrentLocation(self.allLocations()[0]);
};

google.maps.event.addDomListener(window, 'load', initMap(downtownNashville));

/* delay this to allow time for google maps to add divs to the map */
setTimeout(function () {
    ko.applyBindings(new ViewModel());
}, 1000);

