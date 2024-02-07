/// <reference path='./vec4.ts'/>
/// <reference path='./quat.ts'/>

class anim_raw_t {
	ext: any; // anim_bone_t | anim_object_t
	is_skinned: bool;
	is_sampled: bool;
	action = "";
	///if arm_skin
	armature: armature_t; // Bone
	///end
	time: f32 = 0.0;
	speed: f32 = 1.0;
	loop = true;
	frame_index = 0;
	on_complete: ()=>void = null;
	paused = false;
	frame_time: f32 = 1 / 60;
	blend_time: f32 = 0.0;
	blend_current: f32 = 0.0;
	blend_action = "";
	blend_factor: f32 = 0.0;
	last_frame_index = -1;
	marker_events: Map<string, (()=>void)[]> = null;
}

// Lerp
let anim_m1 = mat4_identity();
let anim_m2 = mat4_identity();
let anim_vpos = vec4_create();
let anim_vpos2 = vec4_create();
let anim_vscale = vec4_create();
let anim_vscale2 = vec4_create();
let anim_q1 = quat_create();
let anim_q2 = quat_create();
let anim_q3 = quat_create();
let anim_vp = vec4_create();
let anim_vs = vec4_create();

function anim_create(): anim_raw_t {
	let raw = new anim_raw_t();
	scene_animations.push(raw);
	return raw;
}

function anim_play_super(raw: anim_raw_t, action = "", on_complete: ()=>void = null, blend_time = 0.0, speed = 1.0, loop = true) {
	if (blend_time > 0) {
		raw.blend_time = blend_time;
		raw.blend_current = 0.0;
		raw.blend_action = raw.action;
		raw.frame_index = 0;
		raw.time = 0.0;
	}
	else {
		raw.frame_index = -1;
	}
	raw.action = action;
	raw.on_complete = on_complete;
	raw.speed = speed;
	raw.loop = loop;
	raw.paused = false;
}

function anim_play(raw: anim_raw_t, action = "", on_complete: ()=>void = null, blend_time = 0.0, speed = 1.0, loop = true) {
	if (raw.ext != null)  {
		if (raw.ext.constructor == anim_object_t) {
			anim_object_play(raw.ext, action, on_complete, blend_time, speed, loop);
		}
		///if arm_skin
		else if (raw.ext.constructor == anim_bone_t) {
			anim_bone_play(raw.ext, action, on_complete, blend_time, speed, loop);
		}
		///end
	}
	else {
		anim_play_super(raw, action, on_complete, blend_time, speed, loop);
	}
}

function anim_blend_super(raw: anim_raw_t, action1: string, action2: string, factor: f32) {
	raw.blend_time = 1.0; // Enable blending
	raw.blend_factor = factor;
}

function anim_blend(raw: anim_raw_t, action1: string, action2: string, factor: f32) {
	if (raw.ext != null)  {
		///if arm_skin
		if (raw.ext.constructor == anim_bone_t) {
			anim_bone_blend(raw.ext, action1, action2, factor);
		}
		///end
	}
	else {
		anim_blend_super(raw, action1, action2, factor);
	}
}

function anim_pause(raw: anim_raw_t) {
	raw.paused = true;
}

function anim_resume(raw: anim_raw_t) {
	raw.paused = false;
}

function anim_remove(raw: anim_raw_t) {
	array_remove(scene_animations, raw);
}

function anim_update_super(raw: anim_raw_t, delta: f32) {
	if (raw.paused || raw.speed == 0.0) {
		return;
	}
	raw.time += delta * raw.speed;

	if (raw.blend_time > 0 && raw.blend_factor == 0) {
		raw.blend_current += delta;
		if (raw.blend_current >= raw.blend_time) {
			raw.blend_time = 0.0;
		}
	}
}

function anim_update(raw: anim_raw_t, delta: f32) {
	if (raw.ext != null)  {
		if (raw.ext.constructor == anim_object_t) {
			anim_object_update(raw.ext, delta);
		}
		///if arm_skin
		else if (raw.ext.constructor == anim_bone_t) {
			anim_bone_update(raw.ext, delta);
		}
		///end
	}
	else {
		anim_update_super(raw, delta);
	}
}

function anim_is_track_end(raw: anim_raw_t, track: track_t): bool {
	return raw.speed > 0 ?
		raw.frame_index >= track.frames.length - 1 :
		raw.frame_index <= 0;
}

function anim_check_frame_index(raw: anim_raw_t, frame_values: Uint32Array): bool {
	return raw.speed > 0 ?
		((raw.frame_index + 1) < frame_values.length && raw.time > frame_values[raw.frame_index + 1] * raw.frame_time) :
		((raw.frame_index - 1) > -1 && raw.time < frame_values[raw.frame_index - 1] * raw.frame_time);
}

function anim_rewind(raw: anim_raw_t, track: track_t) {
	raw.frame_index = raw.speed > 0 ? 0 : track.frames.length - 1;
	raw.time = track.frames[raw.frame_index] * raw.frame_time;
}

function anim_update_track(raw: anim_raw_t, anim: anim_t) {
	if (anim == null) {
		return;
	}

	let track = anim.tracks[0];

	if (raw.frame_index == -1) {
		anim_rewind(raw, track);
	}

	// Move keyframe
	let sign = raw.speed > 0 ? 1 : -1;
	while (anim_check_frame_index(raw, track.frames)) {
		raw.frame_index += sign;
	}

	// Marker events
	if (raw.marker_events != null && anim.marker_names != null && raw.frame_index != raw.last_frame_index) {
		for (let i = 0; i < anim.marker_frames.length; ++i) {
			if (raw.frame_index == anim.marker_frames[i]) {
				let ar = raw.marker_events.get(anim.marker_names[i]);
				if (ar != null) {
					for (let f of ar) {
						f();
					}
				}
			}
		}
		raw.last_frame_index = raw.frame_index;
	}

	// End of track
	if (anim_is_track_end(raw, track)) {
		if (raw.loop || raw.blend_time > 0) {
			anim_rewind(raw, track);
		}
		else {
			raw.frame_index -= sign;
			raw.paused = true;
		}
		if (raw.on_complete != null && raw.blend_time == 0) {
			raw.on_complete();
		}
	}
}

function anim_update_anim_sampled(raw: anim_raw_t, anim: anim_t, m: mat4_t) {
	if (anim == null) {
		return;
	}
	let track = anim.tracks[0];
	let sign = raw.speed > 0 ? 1 : -1;

	let t = raw.time;
	let ti = raw.frame_index;
	let t1 = track.frames[ti] * raw.frame_time;
	let t2 = track.frames[ti + sign] * raw.frame_time;
	let s: f32 = (t - t1) / (t2 - t1); // Linear

	mat4_set_from_f32_array(anim_m1, track.values, ti * 16); // Offset to 4x4 matrix array
	mat4_set_from_f32_array(anim_m2, track.values, (ti + sign) * 16);

	// Decompose
	mat4_decompose(anim_m1, anim_vpos, anim_q1, anim_vscale);
	mat4_decompose(anim_m2, anim_vpos2, anim_q2, anim_vscale2);

	// Lerp
	vec4_lerp(anim_vp, anim_vpos, anim_vpos2, s);
	vec4_lerp(anim_vs, anim_vscale, anim_vscale2, s);
	quat_lerp(anim_q3, anim_q1, anim_q2, s);

	// Compose
	mat4_from_quat(m, anim_q3);
	mat4_scale(m, anim_vs);
	m._30 = anim_vp.x;
	m._31 = anim_vp.y;
	m._32 = anim_vp.z;
}

function anim_set_frame(raw: anim_raw_t, frame: i32) {
	raw.time = 0;
	raw.frame_index = frame;
	anim_update(raw, frame * raw.frame_time);
}

function anim_notify_on_marker(raw: anim_raw_t, name: string, on_marker: ()=>void) {
	if (raw.marker_events == null) {
		raw.marker_events = new Map();
	}
	let ar = raw.marker_events.get(name);
	if (ar == null) {
		ar = [];
		raw.marker_events.set(name, ar);
	}
	ar.push(on_marker);
}

function anim_remove_marker(raw: anim_raw_t, name: string, on_marker: ()=>void) {
	array_remove(raw.marker_events.get(name), on_marker);
}

function anim_current_frame(raw: anim_raw_t): i32 {
	return Math.floor(raw.time / raw.frame_time);
}

function anim_total_frames(raw: anim_raw_t): i32 {
	return 0;
}
