import React, { Component } from 'react';
import got from 'got';
import './App.css';
import mapboxgl from 'mapbox-gl'
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions'
import { lineString, point, along, pointToLineDistance } from '@turf/turf'
import TinyQueue from 'tinyqueue';

mapboxgl.accessToken = 'pk.eyJ1Ijoia3JlM2QiLCJhIjoiY2p1ZnhpNzBiMGZzeDN5cGl4eXNqd2F5NiJ9.mKFC_TR6CyOPC6j_PaAOWw';

const BASE_URL = 'http://johnson.kreed.org:8000/api/rider'
//const BASE_URL = 'https://web-production.lime.bike/api/rider'

function boundsFromLatLng(lat, lng) {
	const latMin = lat - 0.045
	const latMax = lat + 0.045
	const lngMin = lng - 0.045 / Math.cos((lat * Math.PI) / 180)
	const lngMax = lng + 0.045 / Math.cos((lat * Math.PI) / 180)

	return {
		latMin,
		lngMin,
		latMax,
		lngMax
	}
}

class App extends Component {
	getObjects({ lat, lng } = {}, config = {}) {
		if (!lat || !lng) {
			throw new Error('Missing lat/lng')
		}

		const bounds = boundsFromLatLng(lat, lng)

		return got.get(`${BASE_URL}/v1/views/map`, {
			json: true,
			headers: config.headers,
			query: {
				ne_lat: bounds.latMax,
				ne_lng: bounds.lngMax,
				sw_lat: bounds.latMin,
				sw_lng: bounds.lngMin,
				user_latitude: lat,
				user_longitude: lng,
				zoom: 16
			},
			...config
		})
	}

	addScootersToMap() {
		var features = [];
		for (var ele in this.scooters) {
			ele = this.scooters[ele];
			features.push({
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": ele.lnglat
				},
				"properties": {
					"brand": ele.brand
				}
			});
		}
		var geojson = {
			"type": "FeatureCollection",
			"features": features
		};
		var src = window.map.getSource('scooters');
		if (src) {
			src.setData(geojson);
		} else {
			window.map.addSource("scooters", {
				"type": "geojson",
				"data": geojson
			});
			window.map.addLayer({
				"id": "scooters",
				"type": "symbol",
				"source": "scooters",
				"layout": {
					"icon-image": "monument-15"
				}
			});
		}
	}

	getScooters(lat, lng) {
		const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX3Rva2VuIjoiRUZETEhINUEzM1o2WCIsImxvZ2luX2NvdW50IjoyfQ.dwIb0woXBl50GHZqnHZ--ictTHjXt7bIIMJhSqh60mU';
		const session = '_limebike-web_session="U1VIYUtXOHhmU1FkcTJZQkJiWGo3eDJzZkN2WjhTUW0rUHdZd2pUNGRyckE3SjM2cmJxY1l6aEdLZ1UzOTlwRUhmUVdseVJNWXMyb0lkQzFvbnBBL3lKTEl1TWUzZnRXRGN5c1VJb1YybTc4ZGNxQkN4ekloQVMvSXBlemF2V0c4QXI2NkRMLzJISll0NGFyMjFacG04NWNBUEVsRnFXR3BCTXhmVG1DcEtvT3R5ZGhvejdBQndDdmJZTkk5eGhKek15MldWcEFxY3JmaW41Q1FJSitpWVIrNHVsRVhNOXVNYmtXZm8rdnFnc3hOa1ljMWNFeFNoNzB5Ulcxd05MNitSY2hUeUNCSXhWZnVmK2NBZUlGdlNBYkdzWnB0TmFDc1pSYTBhTU1ZRlc0VGdTSzBHSlNJbkczOU1ZcHpGckNtc1VXRXI1Q2tLdFIyT0JXdXFweFd3PT0tLUQwRXJtM2dtODZ0WUdOUFpqWEY0ZWc9PQ%3D%3D--8dddcdc87dceba8822e03cb4ba6bd62ddf5b067f';
		const h = {
			Authorization: `Bearer ${token}`,
			Cookie: `_limebike-web_session=${session}; path=/; secure; HttpOnly`
		};

		var p = this.getObjects({ lat: lat, lng: lng }, { headers: h });
		p.then((result) => {
			var body = result.body;
			var scooters = body.data.attributes.bikes;
			for (var i = 0; i < scooters.length; ++i) {
				var s = scooters[i];
				this.scooters[s.id] = { brand: "lime", lnglat: [s.attributes.longitude, s.attributes.latitude] };
			}
			this.addScootersToMap();
		});
		return p;
	}

	getScootersAlongLine(line) {
		var proms = [];
		var options = {units: 'meters'};
		var last = null;
		for (var i = 0; i < 1000000000; i += 2500) {
			var a = along(line.geometry, i, options);
			if (JSON.stringify(a) == last) break;
			last = JSON.stringify(a);
			var crd = a.geometry.coordinates;
			var p = this.getScooters(crd[1], crd[0]);
			proms.push(p);
		}
		return Promise.all(proms);
	}

	findRouteVia(a, b, c) {
		const api = 'https://api.mapbox.com/directions/v5/mapbox';
		var from = a.join('%2C');
		var to = b.join('%2C');
		var walk = got.get(`${api}/walking/${from}%3B${to}.json?geometries=polyline&access_token=${mapboxgl.accessToken}`);
		from = b.join('%2C');
		to = c.join('%2C');
		var ride = got.get(`${api}/cycling/${from}%3B${to}.json?geometries=polyline&access_token=${mapboxgl.accessToken}`);
		Promise.all([walk, ride]).then((args) => {
			var walk = JSON.parse(args[0].body);
			var ride = JSON.parse(args[1].body);
			console.log(walk);
			console.log(walk.routes[0].duration);
			console.log(ride);
			console.log(ride.routes[0].duration);
		});
	}

	findNearestScooters(line) {
		var queue = new TinyQueue([], function (a, b) {
			return a.dist - b.dist;
		});
		for (var e in this.scooters) {
			var s = this.scooters[e];
			queue.push({ dist: pointToLineDistance(point(s.lnglat), line.geometry, {units: 'meters'}), key: e});
		}
		var closest = queue.pop();
		var pt = this.scooters[closest.key].lnglat;
		console.log(pt);
		this.findRouteVia(window.directions.getOrigin().geometry.coordinates, pt, window.directions.getDestination().geometry.coordinates);
	}

	componentDidMount() {
		this.scooters = {};
		this.map = new mapboxgl.Map({
			container: this.mapContainer,
			style: 'mapbox://styles/kre3d/cjful4l500mjb2smihw06awcc?optimize=true',
			hash: true,
			center: [-98.34, 30.55],
			zoom: 6
		});
		window.map = this.map;
		var directions = new MapboxDirections({
			accessToken: mapboxgl.accessToken,
			unit: 'metric',
			alternatives: true,
			profile: 'mapbox/walking'
		});
		directions.on('route', (rte) => {
			var data = window.map.getSource('directions')._data.features[2];
			this.getScootersAlongLine(data).then(() => {
				this.findNearestScooters(data);
			});
		});
		window.directions = directions;
		// add to your mapboxgl map
		window.map.addControl(directions);
	}

	render() {
		return (
			<div ref={el => this.mapContainer = el}>
				{this.props.children}
			</div>
		);
	}
}

export default App;
