var initialLocations = [
    {
        locationTypes: ["lodging"],
        locationName: "Courtyard Nashville Downtown"
    },
    {
        locationTypes: [],
        locationName: "AT&T Building",
        locationKeyword: "333 Commerce Street, Nashville, TN 37201"
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

    var searchBox = document.getElementById('pac-input');
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(document.getElementById('searchContainer'));
    var autocomplete = new google.maps.places.Autocomplete(searchBox, autoCompleteOptions);

    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(document.getElementById('yelpReviewsContainer'));
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById('wikiNewsContainer'));

};

var NeighborhoodLocation = function(loc) {
    var self = this;
    this.locationTypes = ko.observableArray(loc.locationTypes);
    this.locationName = ko.observable(loc.locationName);
    this.formattedAddress = ko.observable(loc.formattedAddress);
    this.markerOpen = ko.observable(false);
    this.searchForPlaceMarker(loc);
    
};

NeighborhoodLocation.prototype = {
    createMapMarker: function(placesData) {
        var self = this;
        this.marker = new google.maps.Marker({
            map: map,
            position: placesData[0].geometry.location
        });
        google.maps.event.addListener(self.marker, 'click', function() {
            self.markerOpen(!self.markerOpen());
        });       
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
    }
};


var ViewModel = function() {
    var self = this;
    self.allLocations = ko.observableArray();
    for (var i = 0; i < initialLocations.length; i += 1) {
        self.allLocations().push(new NeighborhoodLocation(initialLocations[i]));
    }
    self.currentLocation = ko.observable();
    self.setCurrentLocation = function(location) {
        self.currentLocation(location);
    };

    self.setCurrentLocation(self.allLocations()[0]);
};

google.maps.event.addDomListener(window, 'load', initMap(downtownNashville));

ko.applyBindings(ViewModel);
