import {BaseGeoImage, IBaseGeoImageParams} from "./BaseGeoImage";
import {Material} from "./Material";
import fetchTiff from './tiff/fetchTiff.js'

interface IGeoVideoParams extends IBaseGeoImageParams {
    videoElement?: HTMLVideoElement;
    src?: string;
}

/**
 * Used to load and display a video stream by specific corners coordinates on the globe.
 * @class
 * @extends {BaseGeoImage}
 */
class GeoTiff extends BaseGeoImage {

    /**
     * Video source url path.
     * @protected
     * @type {string}
     */
    protected _src: string | null;

    constructor(name: string | null, options: IGeoVideoParams = {}) {
        super(name, options);

        this._animate = true;

        this._src = options.src || null;
    }

    public override get instanceName(): string {
        return "GeoTiff";
    }

    /**
     * Sets video source url path.
     * @public
     * @param {string} src - Video url path.
     */
    public setSrc(src: string) {
        this._planet && this._planet._geoImageCreator.remove(this);
        this._src = src;
        this._sourceReady = false;
    }

    /**
     * Sets layer visibility.
     * @public
     * @param {boolean} visibility - Layer visibility.
     */
    public override setVisibility(visibility: boolean) {
        if (visibility != this._visibility) {
            super.setVisibility(visibility);
            if (this._planet) {
                if (visibility) {
                    this._sourceReady && this._planet._geoImageCreator.add(this);
                    this._video && this._video.play();
                } else {
                    this._sourceReady && this._planet._geoImageCreator.remove(this);
                    this._video && this._video.pause();
                }
            }
        }
    }

    protected _onTags(tags) {
		console.warn('_onTags', tags);
		this.tags = tags;
		if (!tags || !tags.anchors) {
			console.warn(`Error: не Tiff формат файла `);
			// this._onError();
		} else {
			const anch = tags.anchors;
			const corners = [[anch.bl.y, anch.bl.x], [anch.br.y, anch.br.x], [anch.tr.y, anch.tr.x], [anch.tl.y, anch.tl.x]];
			this.setCorners(corners);
			this.planet.flyExtent(this.getExtent());
		}

    }
    protected _onTile(tile) {	// Получили 1 тайл или строку тифа
		const tags = this.tags;
		// console.warn('_onTile', tile, tags);
		// отрисовка тайла
		const {ndarray, tSize, dx = 0, dy = 0} = tile;
		if (!tSize) {
			return;	// TODO: по строкам изображения
		}
        let gl = this._planet!.renderer!.handler.gl!;
		const {width, height} = tSize || {};			// размеры тайла
		const bitmapType = ndarray.constructor.name;	// тип ndarray
		const bitmapChanels = ndarray.length / (width * height);	// сколько каналов
		const DefPars = {
			internalFormat: gl.RGBA,   // format we want in the texture
			srcFormat: gl.RGBA,        // format of data we are supplying
			srcType: gl.UNSIGNED_BYTE, // type of data we are supplying
		};
		let {internalFormat, srcFormat, srcType} = DefPars;
		switch(bitmapType) {
			case 'Uint8Array':
				if (bitmapChanels === 3) {
					internalFormat = gl.RGB8;
					srcFormat = gl.RGB;
					// gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1);

				}
				break;
			case 'Uint16Array':
				if (bitmapChanels === 1) {
	// gl.pixelStorei( gl.UNPACK_ALIGNMENT, 1);
					internalFormat = gl.R16UI;
					srcFormat = gl.RED_INTEGER;
					srcType = gl.UNSIGNED_SHORT;
				}
				break;
			case 'Float32Array':
				// mipMapping = false;
				// internalFormat = gl.RGBA32F;
				// format = gl.RGBA;
				// type = gl.FLOAT;
				break;
		}
		gl.texImage2D(gl.TEXTURE_2D,
			0,										// the largest mip
			internalFormat,							// format we want in the texture
			width, height,							// размеры текстуры
			0,										// бордюр
			srcFormat,								// format of data we are supplying
			srcType,								// type of data we are supplying
			ndarray									// ndarray картинки
		);

		// glUtils.setRectangle(gl, 0, 0, width, height);	// Set a rectangle the same size as the image.
	   
		// var matrixLocation = gl.getUniformLocation(program, "u_matrix");
		// gl.uniformMatrix3fv(matrixLocation, false, [		// Set the matrix.
		  // 1,	0,	0,
		  // 0,	1,	0,
		  // dx,	dy, 1,
		// ]);
		// gl.drawArrays(gl.TRIANGLES, 0, 6);		// Draw the rectangle.
		// gl.flush();		// очищает команды буфера.
    }

    /**
     * Creates or refresh source video GL texture.
     * @virtual
     * @protected
     */
    protected override _createSourceTexture() {
        let gl = this._planet!.renderer!.handler.gl!;
        if (this._sourceCreated) {
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture!);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._video!);
        } else {
            this._sourceTexture = this._planet!.renderer!.handler.createTexture_n_webgl1(this._video!);
            this._sourceCreated = true;
        }
    }

    /**
     * Loads planet segment material. In this case - GeoImage source video.
     * @public
     * @param {Material} material - GeoImage planet material.
     */
    public override loadMaterial(material: Material) {
        material.isLoading = true;
        this._creationProceeding = true;
        if (!this._sourceReady && this._src) {
			fetchTiff(this._src, {onTags: this._onTags.bind(this), onTile: this._onTile.bind(this)});
        } else {
            // this._planet!._geoImageCreator.add(this);
        }
    }

    /**
     * @virtual
     * @param {Material} material - GeoImage material.
     */
    public override abortMaterialLoading(material: Material) {
        // this._video && (this._video.src = "");
        // this._creationProceeding = false;
        // material.isLoading = false;
        // material.isReady = false;
    }
}


const vss = `#version 300 es
	in vec2 a_position;			// an attribute is an input (in) to a vertex shader.
	in vec2 a_texCoord;			// It will receive data from a buffer
	uniform vec2 u_resolution;	// Used to pass in the resolution of the canvas
	out vec2 v_texCoord;		// Used to pass the texture coordinates to the fragment shader
	uniform mat3 u_matrix;		// A matrix to transform the positions by

	void main() {
		vec2 position = (u_matrix * vec3(a_position, 1)).xy;	// Multiply the position by the matrix.
		vec2 zeroToOne = position / u_resolution;				// convert the position from pixels to 0.0 to 1.0
		vec2 zeroToTwo = zeroToOne * 2.0;						// convert from 0->1 to 0->2
		vec2 clipSpace = zeroToTwo - 1.0;						// convert from 0->2 to -1->+1 (clipspace)

		gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
		  // pass the texCoord to the fragment shader
		  // The GPU will interpolate this value between points.
		v_texCoord = a_texCoord;
	}
`;

const fss = `#version 300 es
	precision highp float;

	uniform sampler2D u_image;		// our texture
	in vec2 v_texCoord;				// the texCoords passed in from the vertex shader.
	out vec4 outColor;				// we need to declare an output for the fragment shader

	void main() {
	  outColor = texture(u_image, v_texCoord);
	}
`;

const fss16 = `#version 300 es
	precision highp float;

	// uniform sampler2D u_image;		// our texture
	uniform highp usampler2D u_image;		// our texture
	in vec2 v_texCoord;				// the texCoords passed in from the vertex shader.
	out vec4 outColor;				// we need to declare an output for the fragment shader

	void main() {
		uvec4 unsignedIntValues = texture(u_image, v_texCoord);
		float v = float(unsignedIntValues[0]) / 65535.0;
		vec4 floatValues0To65535 = vec4(v, v, v, 1.0);
		// vec4 colorValues0To1 = floatValues0To65535 / 65535.0;
		outColor = floatValues0To65535;
		
		// outColor = vec4(texture(u_image, v_texCoord)) / 65535.0;
	  // outColor = texture(u_image, v_texCoord);
	}
`;


export {GeoTiff};
