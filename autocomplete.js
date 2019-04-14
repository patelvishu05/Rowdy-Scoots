function getFrom()
{
    // document.getElementById('data').innerHTML = document.getElementById('from-loc').value;
    // https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY
    if(document.getElementById('from-loc').value != "")
    {
        var str = "https://maps.googleapis.com/maps/api/geocode/json?address=";
        str += document.getElementById('from-loc').value.replace(/ /g,'+');
        str += "&key=AIzaSyALp3BUmdmMP8zySNw4Xxpp7SP0GSHj3aU";
        console.log(str)
        return str;
    }
    else{
        return window.location.href
    }
}

function getTo()
{
    if(document.getElementById('dest-loc').value != "")
    {
        var str = "https://maps.googleapis.com/maps/api/geocode/json?address=";
        str += document.getElementById('dest-loc').value.replace(/ /g,'+');
        str += "&key=AIzaSyALp3BUmdmMP8zySNw4Xxpp7SP0GSHj3aU";
        console.log(str)
        return str;
    }
    else
    {
        return window.location.href
    }
}

function jsonParser(url)
{
    var xmlhttp = new XMLHttpRequest();
    
    xmlhttp.onreadystatechange = function() {
        console.log("heu")
    if (this.readyState == 4 && this.status == 200) 
    {
        var arr = JSON.parse(this.responseText);
        var out = arr.results[0].geometry.location.lat;
        out += " " + arr.results[0].geometry.location.lng;
        document.getElementById("data").innerHTML = out;
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}













// // google.maps.event.addDomListener(window,'load',initialize)
// var defaultBounds = new google.maps.LatLngBounds(
//     new google.maps.LatLng(-33.89,151.17),
//     new google.maps.LatLng(-33.84,151.26));

//     var options = { bounds: defaultBounds};

// function initialize()
// {    
//     var fromLocation = document.getElementById('from-loc');
//     // var toLocation = new google.maps.Autocomplete(document.getElementById('dest-loc'));

//     var autocomplete = new google.maps.places.Autocomplete(fromLocation,options)
//     document.getElementById('data').innerHTML = "It works";
// }

