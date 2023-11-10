import './css/og.css'
import {
	Globe,
	XYZ,
	GeoTiff
} from './src';

const osm = new XYZ("OpenStreetMap", {
	isBaseLayer: true,
	url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
	// url: "//{s}tilecart.kosmosnimki.ru/kosmo/{z}/{x}/{y}.png",
	visibility: true,
});

let geoTiff = new GeoTiff("USA precipitation 08.05.2016", {
	minZoom: 0,
	maxZoom: 10,
	src: "/data/B_RGB.tif",
	corners: [[-134.7904382939764, 55.07955352950936], [-54.984314759410594, 54.98843914299802], [-55.041854075913825, 19.820153025849297], [-134.89882012831265, 19.631495126944017]],
	visibility: true,
	isBaseLayer: false,
	attribution: 'USA precipitation 08.05.2016, nasasearch.nasa.gov',
	opacity: 0.7
});

const globus = new Globe({
	target, // canvas
	// target: "globus", // a HTMLDivElement which its id is
	controls,
	name: "Earth",
	atmosphereEnabled: false,
	layers: [osm, geoTiff],
	viewExtent: [ -180, -90, 180, 90.0]
});
