import React, { Component } from 'react';
import got from 'got';
import './App.css';
import mapboxgl from 'mapbox-gl'
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions'
import { point, along, distance } from '@turf/turf'
import TinyQueue from 'tinyqueue';

mapboxgl.accessToken = 'pk.eyJ1Ijoia3JlM2QiLCJhIjoiY2p1ZnhpNzBiMGZzeDN5cGl4eXNqd2F5NiJ9.mKFC_TR6CyOPC6j_PaAOWw';

const BASE_URL = 'http://johnson.kreed.org:8000/api/rider'
const py = 'http://johnson.kreed.org:8081'
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
					"icon-image": "{brand}"
				}
			});
		}
	}

	getScooters(lat, lng) {
		const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX3Rva2VuIjoiRUZETEhINUEzM1o2WCIsImxvZ2luX2NvdW50Ijo2fQ.OcPQjtQllHVFOBjK-tUjXEXhtPRn73OjILLrW3PDK6A';
		const session = 'QlB1ZDJySDN4OXBDOURZMEs4M0RrUVc1RmVjdXVOT1FzNG1kay9icHNKY2Z3R2I0L0dieXorKzRtUjdLeDloTTF4bEMvU0hSR0hQbDJMN2FkNkxrZ2N2TUlPV21VbVhGd0VBa21sZzdLUFQvQkltTHZoNUlodUtyTGRlWEgyNmRVUlZjVEhxVDJ6OVdvMkJyRmJiaGQ5NitLY2ZpRWVnUTJHTEk0Y3ZER2NDbnE4WkhZVDBqQS91RWdGdFdsRjdRSWVQRXBGWDRKelFCM3pLTnVjaUlvVEtFdTB1TUp6eTU2ajh4aE5tNks4N2QvNTJUd25oY3BPdVUxdTRFWWllN2d5eGQrUCs5TE5ES2c0MlQ2V3hmYlJ4eFNaaTdxdFNQLzhxNGl3RW91RDE2eUNjRkVoWUZUU0lSSzVJWXV2ckYvU2NDUFN5cWNGZ0tvVHh1aHNYK3FnPT0tLU1aRjRuVTl0WXhUc1kyQlg0VGhXdHc9PQ%3D%3D--958f92589231430b9af2c6a319d522b12d2c148e'
		const h = {
			Authorization: `Bearer ${token}`,
			Cookie: `_limebike-web_session=${session}; path=/; secure; HttpOnly`
		};

		var lime = this.getObjects({ lat: lat, lng: lng }, { headers: h });
		lime.then((result) => {
			var body = result.body;
			console.log('lime', body);
			var scooters = body.data.attributes.bikes;
			if (!scooters) return;
			for (var i = 0; i < scooters.length; ++i) {
				var s = scooters[i];
				this.scooters[s.id] = { brand: "lime", lnglat: [s.attributes.longitude, s.attributes.latitude] };
			}
			this.addScootersToMap();
		});
		var bird = got.get(`${py}/getscooters/${lat}?longitude=${lng}`)
		bird.then((result) => {
			var scooters = JSON.parse(result.body);
			console.log('bird', scooters);
			for (var i = 0; i < scooters.length; ++i) {
				var s = scooters[i];
				//this.scooters[i] = { brand: "bird", lnglat: [s.longitude, s.latitude] };
				this.scooters[s.id] = { brand: "bird", lnglat: [s.location.longitude, s.location.latitude] };
			}
			this.addScootersToMap();
		});
		return Promise.all([lime, bird]);
	}

	getScootersAlongLine(line) {
		var proms = [];
		var options = {units: 'meters'};
		var last = null;
		for (var i = 0; i < 1000000000; i += 2500) {
			var a = along(line.geometry, i, options);
			if (JSON.stringify(a) === last) break;
			last = JSON.stringify(a);
			var crd = a.geometry.coordinates;
			var p = this.getScooters(crd[1], crd[0]);
			proms.push(p);
		}
		return Promise.all(proms);
	}

	addRoute(duration, distance, route) {
		var filterGroup = document.getElementById('filter-group');
		var layerID = filterGroup.childElementCount;

		var input = document.createElement('input');
		input.type = 'checkbox';
		input.id = layerID;
		input.checked = false;
		input.routes = route;
		filterGroup.appendChild(input);
		 
		var label = document.createElement('label');
		label.setAttribute('for', layerID);
		duration = Math.round(10 * duration / 60) / 10;
		distance = Math.round(distance / 100) / 10;
		label.textContent = duration + ' min ' + distance + ' km';
		filterGroup.appendChild(label);

		input.addEventListener('change', function(e) {
			if (e.target.checked) {
				var rte = route.ride ? route.walk.routes.concat(route.ride.routes) : route.walk;
				rte.synth = true;
				window.directions.setDirections(rte);
				//window.directions.actions.eventEmit('route', { route: route.walk, synth: true });
			}
		});
	}

	findRouteVia(a, b, c) {
		const api = 'https://api.mapbox.com/directions/v5/mapbox';
		var from = a.join('%2C');
		var to = b.join('%2C');
		var walk = got.get(`${api}/walking/${from}%3B${to}.json?geometries=polyline&steps=true&overview=full&access_token=${mapboxgl.accessToken}`);
		from = b.join('%2C');
		to = c.join('%2C');
		var ride = got.get(`${api}/cycling/${from}%3B${to}.json?geometries=polyline&steps=true&overview=full&access_token=${mapboxgl.accessToken}`);
		Promise.all([walk, ride]).then((args) => {
			var walk = JSON.parse(args[0].body);
			var ride = JSON.parse(args[1].body);
			var duration = walk.routes[0].duration + ride.routes[0].duration;
			var distance = walk.routes[0].distance + ride.routes[0].distance;
			this.addRoute(duration, distance, { walk: walk, ride: ride });
		});
	}

	findNearestScooters(pt) {
		var queue = new TinyQueue([], function (a, b) {
			return a.dist - b.dist;
		});
		for (var e in this.scooters) {
			var s = this.scooters[e];
			queue.push({ dist: distance(point(s.lnglat), pt, {units: 'meters'}), key: e});
		}
		for (var i = 0; i < Math.min(5, queue.length); ++i) {
			var closest = queue.pop();
			var pt = this.scooters[closest.key].lnglat;
			this.findRouteVia(window.directions.getOrigin().geometry.coordinates, pt, window.directions.getDestination().geometry.coordinates);
		}
	}

	componentDidMount() {
		this.scooters = {};
		this.map = new mapboxgl.Map({
			container: this.mapContainer,
			//style: 'mapbox://styles/kre3d/cjugghlyx40u21fqdyu0ix6ld',
			style: 'https://kreed.org/scoot.json',
			hash: true,
			center: [-98.34, 30.55],
			zoom: 6
		});
		window.map = this.map;
		var directions = new MapboxDirections({
			accessToken: mapboxgl.accessToken,
			unit: 'metric',
			controls: { instructions: false, profileSwitcher: false },
			profile: 'mapbox/walking'
		});
		directions.on('route', (rte) => {
			console.log(rte);
			if (rte.route.synth) return;
			var data = window.map.getSource('directions')._data.features[2];
			rte = rte.route;
			console.log('rte', rte);
			var grp = document.getElementById('filter-group');
			while (grp.firstChild) {
				grp.removeChild(grp.firstChild);
			}
			this.addRoute(rte[0].distance, rte[0].duration, { walk: rte })
			this.getScootersAlongLine(data).then(() => {
				this.findNearestScooters(window.directions.getOrigin());
			});
		});
		window.directions = directions;
		// add to your mapboxgl map
		window.map.addControl(directions);
		var ctrl = this.mapContainer.getElementsByClassName('mapbox-directions-inputs')[0];
		console.log(ctrl);

		var filterGroup = document.createElement('nav');
		filterGroup.id = 'filter-group';
		filterGroup.className = 'filter-group';
		ctrl.appendChild(filterGroup);
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
