Neighborhood Map Project
========================

#James Tench

## Description
This program demonstrates the use of multiple APIs and includes coding with knockoutjs MVVM pattern
The map displays some initial points of interest in Nashville TN

### interface design
The interface has a list view of the items you can tour, a search box to look up additional
locations, and an area to show the streetview image of the location.

### app functionality
The app allows additional functionalty by providing info windows with Foursquare infomation
displayed in the window. In addition, searching for new locations automatically adds them 
to the list of toured locations. Additional locations can be removed from the map as well.

### app architecture
The app uses Knockouts MVVM patters. Observables update the UI, and Objects also subscribe
to observable data to perform automatic updates when data becomes available from ajax calls

### asynchronous data usage
The app uses Google Maps API, Google Places API, Google AutoComplete and Search API, 
Google StreetView API, Foursquare API all in a asynchronous manner

### geospacial / map functionality
The map uses custome icons based on the type identified in Google Places API

### location details functionality
Each location has additional data included in it's InfoWindow. Specifically, information
about Foursquare checkin data

### search functionality
The app has a search box, and implements additional functionaly with the auto complete feature

### list view functionality
The app offers a list view of the locations on the map. The list allows for additions and deletions

### code quality
code passes js lint and w3c validation tests

### comments
comments are provided throughout the code, and code naming conventions are self documenting

### documentation
this readme file

### instructions
both source and dist files are located at https://github.com/tenchjames/udacity-frontend-nano-neighborhoodmap.git

The working site is hosted at http://tenchjames.github.io/map/

### sources used
Google Maps API, Foursquare API, stack overflow, w3c, knockoutjs tutorial



