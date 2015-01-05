var initialLocations = [
    {
        locationTypes: ["lodging"],
        locationName: "Courtyard Nashville Downtown"
    }
];

var locations = [];

/* google maps functions */
var map;
var downtownNashville = new google.maps.LatLng(36.1586405, -86.7762455);
var initMap = function(focalPoint) {
    var mapOptions = {
        center: focalPoint,
        zoom: 16
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById('yelpReviews'));
};

var NeighborhoodLocation = function(loc) {
    var self = this;
    this.locationTypes = ko.observableArray(loc.locationTypes);
    this.locationName = ko.observable(loc.locationName);
    this.formattedAddress = ko.observable(loc.formattedAddress);
    this.markerOpen = ko.observable(false);

    var createMapMarker = function(placesData) {
        var marker = new google.maps.Marker({
            map: map,
            position: placesData[0].geometry.location           
        });
        google.maps.event.addListener(marker, 'click', function() {
            self.markerOpen(!self.markerOpen());
            console.log(self.markerOpen());
        });        
    };

    var addPlaceCallback = function(results, status)  {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            createMapMarker(results);
        }
    };
    var searchForPlaceMarker = function(location) {
        var service = new google.maps.places.PlacesService(map);
        var request = {};
        request.location = downtownNashville;
        request.radius = 1000;

        if (location.locationName && location.locationName !== "") {
            request.name = location.locationName;
        }
        if (location.locationTypes && location.locationTypes.length > 0) {
            request.type = location.locationTypes;
        } 
        service.nearbySearch(request, addPlaceCallback);       
    };
    searchForPlaceMarker(loc);
};


var ViewModel = function() {
    var self = this;
    self.allLocations = ko.observableArray();
    for (var i = 0; i < initialLocations.length; i += 1) {
        self.allLocations().push(new NeighborhoodLocation(initialLocations[i]));
    }
};

google.maps.event.addDomListener(window, 'load', initMap(downtownNashville));

ko.applyBindings(ViewModel);
