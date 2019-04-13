import React, { Component } from 'react';
import logo from './logo.svg';
import Lime from '@multicycles/lime';
import got from 'got';
import './App.css';
import mapboxgl from 'mapbox-gl'

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
		console.log(config);

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

	componentDidMount() {
		this.map = new mapboxgl.Map({
			container: this.mapContainer,
			style: 'mapbox://styles/kre3d/cjful4l500mjb2smihw06awcc?optimize=true',
			hash: true,
			center: [-98.34, 30.55],
			zoom: 6
		});
		window.map = this.map;

		const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX3Rva2VuIjoiRUZETEhINUEzM1o2WCIsImxvZ2luX2NvdW50IjoyfQ.dwIb0woXBl50GHZqnHZ--ictTHjXt7bIIMJhSqh60mU';
		const session = '_limebike-web_session="U1VIYUtXOHhmU1FkcTJZQkJiWGo3eDJzZkN2WjhTUW0rUHdZd2pUNGRyckE3SjM2cmJxY1l6aEdLZ1UzOTlwRUhmUVdseVJNWXMyb0lkQzFvbnBBL3lKTEl1TWUzZnRXRGN5c1VJb1YybTc4ZGNxQkN4ekloQVMvSXBlemF2V0c4QXI2NkRMLzJISll0NGFyMjFacG04NWNBUEVsRnFXR3BCTXhmVG1DcEtvT3R5ZGhvejdBQndDdmJZTkk5eGhKek15MldWcEFxY3JmaW41Q1FJSitpWVIrNHVsRVhNOXVNYmtXZm8rdnFnc3hOa1ljMWNFeFNoNzB5Ulcxd05MNitSY2hUeUNCSXhWZnVmK2NBZUlGdlNBYkdzWnB0TmFDc1pSYTBhTU1ZRlc0VGdTSzBHSlNJbkczOU1ZcHpGckNtc1VXRXI1Q2tLdFIyT0JXdXFweFd3PT0tLUQwRXJtM2dtODZ0WUdOUFpqWEY0ZWc9PQ%3D%3D--8dddcdc87dceba8822e03cb4ba6bd62ddf5b067f';
		const h = {
			Authorization: `Bearer ${token}`,
			Cookie: `_limebike-web_session=${session}; path=/; secure; HttpOnly`
		};
		(async () => {
		const {body, headers} = await this.getObjects({ lat: 29.4231409, lng: -98.5042806 }, { headers: h });
			var scooters = body.data.attributes.bikes;
			var features = [];
			for (var i = 0; i < scooters.length; ++i) {
				var s = scooters[i];
				console.log(s.attributes);
				var lnglat = [s.attributes.longitude, s.attributes.latitude];
				var geojson = {
					"type": "Feature",
					"geometry": {
					"type": "Point",
						"coordinates": lnglat
					}
				}
				features.push(geojson);
			}


			window.map.addLayer({
				"id": "points",
				"type": "symbol",
				"source": {
					"type": "geojson",
					"data": {
						"type": "FeatureCollection",
						"features": features
					}
				},
				"layout": {
					"icon-image": "monument-15"
				}
			});
		})();
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
