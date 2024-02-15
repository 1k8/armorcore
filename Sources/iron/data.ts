
// Global data list and asynchronous data loading
let data_cached_scene_raws: Map<string, scene_t> = new Map();
let data_cached_meshes: Map<string, mesh_data_t> = new Map();
let data_cached_lights: Map<string, light_data_t> = new Map();
let data_cached_cameras: Map<string, camera_data_t> = new Map();
let data_cached_materials: Map<string, material_data_t> = new Map();
let data_cached_particles: Map<string, particle_data_t> = new Map();
let data_cached_worlds: Map<string, world_data_t> = new Map();
let data_cached_shaders: Map<string, shader_data_t> = new Map();

let data_cached_blobs: Map<string, ArrayBuffer> = new Map();
let data_cached_images: Map<string, image_t> = new Map();
let data_cached_videos: Map<string, video_t> = new Map();
let data_cached_fonts: Map<string, g2_font_t> = new Map();
///if arm_audio
let data_cached_sounds: Map<string, sound_t> = new Map();
///end

let data_assets_loaded: i32 = 0;
let _data_loading_meshes: Map<string, ((d: mesh_data_t)=>void)[]> = new Map();
let _data_loading_lights: Map<string, ((d: light_data_t)=>void)[]> = new Map();
let _data_loading_cameras: Map<string, ((d: camera_data_t)=>void)[]> = new Map();
let _data_loading_materials: Map<string, ((d: material_data_t)=>void)[]> = new Map();
let _data_loading_particles: Map<string, ((d: particle_data_t)=>void)[]> = new Map();
let _data_loading_worlds: Map<string, ((d: world_data_t)=>void)[]> = new Map();
let _data_loading_shaders: Map<string, ((d: shader_data_t)=>void)[]> = new Map();
let _data_loading_scene_raws: Map<string, ((fmt: scene_t)=>void)[]> = new Map();
let _data_loading_blobs: Map<string, ((ab: ArrayBuffer)=>void)[]> = new Map();
let _data_loading_images: Map<string, ((img: image_t)=>void)[]> = new Map();
let _data_loading_videos: Map<string, ((vid: video_t)=>void)[]> = new Map();
let _data_loading_fonts: Map<string, ((f: g2_font_t)=>void)[]> = new Map();
///if arm_audio
let _data_loading_sounds: Map<string, ((snd: sound_t)=>void)[]> = new Map();
///end

function data_sep(): string {
	///if krom_windows
	return "\\";
	///else
	return "/";
	///end
}

function data_path(): string {
	///if krom_android
	return "data" + data_sep();
	///else
	return "." + data_sep() + "data" + data_sep();
	///end
}

function data_delete_all() {
	let cached_meshes: mesh_data_t[] = Array.from(data_cached_meshes.values());
	for (let i: i32 = 0; i < cached_meshes.length; ++i) {
		let c: mesh_data_t = cached_meshes[i];
		mesh_data_delete(c);
	}
	data_cached_meshes = new Map();

	let cached_shaders: shader_data_t[] = Array.from(data_cached_shaders.values());
	for (let i: i32 = 0; i < cached_shaders.length; ++i) {
		let c: shader_data_t = cached_shaders[i];
		shader_data_delete(c);
	}
	data_cached_shaders = new Map();

	data_cached_scene_raws = new Map();
	data_cached_lights = new Map();
	data_cached_cameras = new Map();
	data_cached_materials = new Map();
	data_cached_particles = new Map();
	data_cached_worlds = new Map();
	render_path_unload();
	data_cached_blobs = new Map();

	let cached_images: image_t[] = Array.from(data_cached_images.values());
	for (let i: i32 = 0; i < cached_images.length; ++i) {
		let c: image_t = cached_images[i];
		image_unload(c);
	}
	data_cached_images = new Map();

	///if arm_audio
	let cached_sounds: sound_t[] = Array.from(data_cached_sounds.values());
	for (let i: i32 = 0; i < cached_sounds.length; ++i) {
		let c = cached_sounds[i];
		sound_unload(c);
	}
	data_cached_sounds = new Map();
	///end

	let cached_videos: video_t[] = Array.from(data_cached_videos.values());
	for (let i: i32 = 0; i < cached_videos.length; ++i) {
		let c: video_t = cached_videos[i];
		video_unload(c);
	}
	data_cached_videos = new Map();

	let cached_fonts: g2_font_t[] = Array.from(data_cached_fonts.values());
	for (let i: i32 = 0; i < cached_fonts.length; ++i) {
		let c: g2_font_t = cached_fonts[i];
		g2_font_unload(c);
	}
	data_cached_fonts = new Map();
}

function data_get_mesh(file: string, name: string, done: (md: mesh_data_t)=>void) {
	let handle: string = file + name;
	let cached: mesh_data_t = data_cached_meshes.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: mesh_data_t)=>void)[] = _data_loading_meshes.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_meshes.set(handle, [done]);

	mesh_data_parse(file, name, function (b: mesh_data_t) {
		data_cached_meshes.set(handle, b);
		b._handle = handle;
		let loading_meshes: ((d: mesh_data_t)=>void)[] = _data_loading_meshes.get(handle);
		for (let i: i32 = 0; i < loading_meshes.length; ++i) {
			loading_meshes[i](b);
		}
		_data_loading_meshes.delete(handle);
	});
}

function data_delete_mesh(handle: string) {
	// Remove cached mesh
	let mesh: mesh_data_t = data_cached_meshes.get(handle);
	if (mesh == null) {
		return;
	}
	mesh_data_delete(mesh);
	data_cached_meshes.delete(handle);
}

function data_get_light(file: string, name: string, done: (ld: light_data_t)=>void) {
	let handle: string = file + name;
	let cached: light_data_t = data_cached_lights.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: light_data_t)=>void)[] = _data_loading_lights.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_lights.set(handle, [done]);

	light_data_parse(file, name, function (b: light_data_t) {
		data_cached_lights.set(handle, b);
		let loading_lights: ((d: light_data_t)=>void)[] = _data_loading_lights.get(handle);
		for (let i: i32 = 0; i < loading_lights.length; ++i) {
			loading_lights[i](b);
		}
		_data_loading_lights.delete(handle);
	});
}

function data_get_camera(file: string, name: string, done: (cd: camera_data_t)=>void) {
	let handle: string = file + name;
	let cached: camera_data_t = data_cached_cameras.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: camera_data_t)=>void)[] = _data_loading_cameras.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_cameras.set(handle, [done]);

	camera_data_parse(file, name, function (b: camera_data_t) {
		data_cached_cameras.set(handle, b);
		let loading_cameras: ((d: camera_data_t)=>void)[] = _data_loading_cameras.get(handle);
		for (let i: i32 = 0; i < loading_cameras.length; ++i) {
			loading_cameras[i](b);
		}
		_data_loading_cameras.delete(handle);
	});
}

function data_get_material(file: string, name: string, done: (md: material_data_t)=>void) {
	let handle: string = file + name;
	let cached: material_data_t = data_cached_materials.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: material_data_t)=>void)[] = _data_loading_materials.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_materials.set(handle, [done]);

	material_data_parse(file, name, function (b: material_data_t) {
		data_cached_materials.set(handle, b);
		let loading_materials: ((d: material_data_t)=>void)[] = _data_loading_materials.get(handle);
		for (let i: i32 = 0; i < loading_materials.length; ++i) {
			loading_materials[i](b);
		}
		_data_loading_materials.delete(handle);
	});
}

function data_get_particle(file: string, name: string, done: (pd: particle_data_t)=>void) {
	let handle: string = file + name;
	let cached: particle_data_t = data_cached_particles.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: particle_data_t)=>void)[] = _data_loading_particles.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_particles.set(handle, [done]);

	particle_data_parse(file, name, function (b: particle_data_t) {
		data_cached_particles.set(handle, b);
		let loading_particles: ((d: particle_data_t)=>void)[] = _data_loading_particles.get(handle);
		for (let i: i32 = 0; i < loading_particles.length; ++i) {
			loading_particles[i](b);
		}
		_data_loading_particles.delete(handle);
	});
}

function data_get_world(file: string, name: string, done: (wd: world_data_t)=>void) {
	if (name == null) { // No world defined in scene
		done(null);
		return;
	}

	let handle: string = file + name;
	let cached: world_data_t = data_cached_worlds.get(handle);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: world_data_t)=>void)[] = _data_loading_worlds.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_worlds.set(handle, [done]);

	world_data_parse(file, name, function (b: world_data_t) {
		data_cached_worlds.set(handle, b);
		let loading_worlds: ((d: world_data_t)=>void)[] = _data_loading_worlds.get(handle);
		for (let i: i32 = 0; i < loading_worlds.length; ++i) {
			loading_worlds[i](b);
		}
		_data_loading_worlds.delete(handle);
	});
}

function data_get_shader(file: string, name: string, done: (sd: shader_data_t)=>void, override_context: shader_override_t = null) {
	// Only one context override per shader data for now
	let handle: string = name;
	if (override_context != null) {
		handle += "2";
	}
	let cached: shader_data_t = data_cached_shaders.get(handle); // Shader must have unique name
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((d: shader_data_t)=>void)[] = _data_loading_shaders.get(handle);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_shaders.set(handle, [done]);

	shader_data_parse(file, name, function (b: shader_data_t) {
		data_cached_shaders.set(handle, b);
		let loading_shaders: ((d: shader_data_t)=>void)[] = _data_loading_shaders.get(handle);
		for (let i: i32 = 0; i < loading_shaders.length; ++i) {
			loading_shaders[i](b);
		}
		_data_loading_shaders.delete(handle);
	}, override_context);
}

function data_get_scene_raw(file: string, done: (fmt: scene_t)=>void) {
	let cached: scene_t = data_cached_scene_raws.get(file);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((fmt: scene_t)=>void)[] = _data_loading_scene_raws.get(file);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_scene_raws.set(file, [done]);

	// If no extension specified, set to .arm
	let ext: string = file.endsWith(".arm") ? "" : ".arm";

	data_get_blob(file + ext, function (b: ArrayBuffer) {
		let parsed: scene_t = null;
		parsed = armpack_decode(b);
		data_return_scene_raw(file, parsed);
	});
}

function data_return_scene_raw(file: string, parsed: scene_t) {
	data_cached_scene_raws.set(file, parsed);
	let loading_scene_raws: ((fmt: scene_t)=>void)[] = _data_loading_scene_raws.get(file);
	for (let i: i32 = 0; i < loading_scene_raws.length; ++i) {
		loading_scene_raws[i](parsed);
	}
	_data_loading_scene_raws.delete(file);
}

function data_get_mesh_raw_by_name(datas: mesh_data_t[], name: string): mesh_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_light_raw_by_name(datas: light_data_t[], name: string): light_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_camera_raw_by_name(datas: camera_data_t[], name: string): camera_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_material_raw_by_name(datas: material_data_t[], name: string): material_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_particle_raw_by_name(datas: particle_data_t[], name: string): particle_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_world_raw_by_name(datas: world_data_t[], name: string): world_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

function data_get_shader_raw_by_name(datas: shader_data_t[], name: string): shader_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}

///if arm_audio
function data_get_speaker_raw_by_name(datas: speaker_data_t[], name: string): speaker_data_t {
	if (name == "") {
		return datas[0];
	}
	for (let i: i32 = 0; i < datas.length; ++i) {
		if (datas[i].name == name) {
			return datas[i];
		}
	}
	return null;
}
///end

// Raw assets
function data_get_blob(file: string, done: (ab: ArrayBuffer)=>void) {
	let cached: ArrayBuffer = data_cached_blobs.get(file); // Is already cached
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((ab: ArrayBuffer)=>void)[] = _data_loading_blobs.get(file); // Is already being loaded
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_blobs.set(file, [done]); // Start loading

	// krom_load_blob(resolvePath(file), function (b: ArrayBuffer) {
		let b: ArrayBuffer = krom_load_blob(data_resolve_path(file));
		data_cached_blobs.set(file, b);
		let loading_blobs: ((d: ArrayBuffer)=>void)[] = _data_loading_blobs.get(file);
		for (let i: i32 = 0; i < loading_blobs.length; ++i) {
			loading_blobs[i](b);
		}
		_data_loading_blobs.delete(file);
		data_assets_loaded++;
	// });
}

function data_delete_blob(handle: string) {
	let blob: ArrayBuffer = data_cached_blobs.get(handle);
	if (blob == null) {
		return;
	}
	data_cached_blobs.delete(handle);
}

function data_get_image(file: string, done: (img: image_t)=>void, readable: bool = false, format: string = "RGBA32") {
	let cached: image_t = data_cached_images.get(file);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((img: image_t)=>void)[] = _data_loading_images.get(file);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_images.set(file, [done]);

	///if arm_image_embed
	let image_blob: ArrayBuffer = data_cached_blobs.get(file);
	if (image_blob != null) {
		image_from_encoded_bytes(image_blob, ".k", function (b: image_t) {
			data_cached_images.set(file, b);
			let loading_images: ((d: image_t)=>void)[] = _data_loading_images.get(file);
			for (let i: i32 = 0; i < loading_images.length; ++i) {
				loading_images[i](b);
			}
			_data_loading_images.delete(file);
			data_assets_loaded++;
		}, readable);
		return;
	}
	///end

	// krom_load_image(resolvePath(file), readable, function (b: image_t) {
		let image_: any = krom_load_image(data_resolve_path(file), readable);
		if (image_ != null) {
			let b: image_t = image_from_texture(image_);
			data_cached_images.set(file, b);
			let loading_images: ((d: image_t)=>void)[] = _data_loading_images.get(file);
			for (let i: i32 = 0; i < loading_images.length; ++i) {
				loading_images[i](b);
			}
			_data_loading_images.delete(file);
			data_assets_loaded++;
		}
	// });
}

function data_delete_image(handle: string) {
	let image: image_t = data_cached_images.get(handle);
	if (image == null) {
		return;
	}
	image_unload(image);
	data_cached_images.delete(handle);
}

///if arm_audio
function data_get_sound(file: string, done: (snd: sound_t)=>void) {
	let cached: sound_t = data_cached_sounds.get(file);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((snd: sound_t)=>void)[] = _data_loading_sounds.get(file);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_sounds.set(file, [done]);

	// krom_load_sound(data_resolve_path(file), function (b: sound_t) {
		let b: sound_t = sound_create(krom_load_sound(data_resolve_path(file)));
		data_cached_sounds.set(file, b);
		let loading_sounds: ((d: sound_t)=>void)[] = _data_loading_sounds.get(file);
		for (let i: i32 = 0; i < loading_sounds.length; ++i) {
			loading_sounds[i](b);
		}
		_data_loading_sounds.delete(file);
		data_assets_loaded++;
	// });
}

function data_delete_sound(handle: string) {
	let sound: sound_t = data_cached_sounds.get(handle);
	if (sound == null) {
		return;
	}
	sound_unload(sound);
	data_cached_sounds.delete(handle);
}
///end

function data_get_video(file: string, done: (vid: video_t)=>void) {
	file = file.substring(0, file.length - 4) + ".webm";
	let cached: video_t = data_cached_videos.get(file);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((vid: video_t)=>void)[] = _data_loading_videos.get(file);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_videos.set(file, [done]);

	// krom_load_video(data_resolve_path(file), function (b: video_t) {
	// 	cachedVideos.set(file, b);
	//	let loading_videos: ((d: video_t[])=>void)[] = data_loading_videos.get(file);
	//	for (let i: i32 = 0; i < loading_videos.length; ++i) {
	//		loading_videos[i](b);
	//	}
	// 	data_loading_videos.delete(file);
	// 	data_assets_loaded++;
	// });
}

function data_delete_video(handle: string) {
	let video: video_t = data_cached_videos.get(handle);
	if (video == null) {
		return;
	}
	video_unload(video);
	data_cached_videos.delete(handle);
}

function data_get_font(file: string, done: (f: g2_font_t)=>void) {
	let cached: g2_font_t = data_cached_fonts.get(file);
	if (cached != null) {
		done(cached);
		return;
	}

	let loading: ((f: g2_font_t)=>void)[] = _data_loading_fonts.get(file);
	if (loading != null) {
		loading.push(done);
		return;
	}

	_data_loading_fonts.set(file, [done]);

	// krom_load_blob(resolvePath(file), function (blob: ArrayBuffer) {
		let blob: ArrayBuffer = krom_load_blob(data_resolve_path(file));
		let b: g2_font_t = g2_font_create(blob);
		data_cached_fonts.set(file, b);

		let loading_fonts: ((f: g2_font_t)=>void)[] = _data_loading_fonts.get(file);
		for (let i: i32 = 0; i < loading_fonts.length; ++i) {
			loading_fonts[i](b);
		}
		_data_loading_fonts.delete(file);
		data_assets_loaded++;
	// });
}

function data_delete_font(handle: string) {
	let font: g2_font_t = data_cached_fonts.get(handle);
	if (font == null) {
		return;
	}
	g2_font_unload(font);
	data_cached_fonts.delete(handle);
}

function data_is_abs(file: string): bool {
	return file.charAt(0) == "/" || file.charAt(1) == ":" || (file.charAt(0) == "\\" && file.charAt(1) == "\\");
}

function data_is_up(file: string): bool {
	return file.charAt(0) == "." && file.charAt(1) == ".";
}

function data_base_name(path: string): string {
	let slash: i32 = path.lastIndexOf(data_sep());
	return slash >= 0 ? path.substring(slash + 1) : path;
}

function data_resolve_path(file: string): string {
	if (data_is_abs(file) || data_is_up(file)) {
		return file;
	}
	return data_path() + file;
}
