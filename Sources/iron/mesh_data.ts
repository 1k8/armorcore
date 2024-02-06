
function mesh_data_parse(name: string, id: string, done: (md: mesh_data_t)=>void) {
	data_get_scene_raw(name, (format: scene_t) => {
		let raw: mesh_data_t = data_get_mesh_raw_by_name(format.mesh_datas, id);
		if (raw == null) {
			Krom.log(`Mesh data "${id}" not found!`);
			done(null);
		}

		mesh_data_create(raw, (dat: mesh_data_t) => {
			///if arm_skin
			if (raw.skin != null) {
				mesh_data_init_skeleton_transforms(dat, raw.skin.transforms_inv);
			}
			///end
			done(dat);
		});
	});
}

function mesh_data_create(raw: mesh_data_t, done: (md: mesh_data_t)=>void) {
	if (raw.scale_pos == null) raw.scale_pos = 1.0;
	if (raw.scale_tex == null) raw.scale_tex = 1.0;

	raw._refcount = 0;
	raw._vertex_buffer_map = new Map();
	raw._ready = false;
	raw._instanced = false;
	raw._instance_count = 0;

	// Mesh data
	let indices: Uint32Array[] = [];
	let material_indices: i32[] = [];
	for (let ind of raw.index_arrays) {
		indices.push(ind.values);
		material_indices.push(ind.material);
	}

	// Skinning
	// Prepare vertex array for skinning and fill size data
	let vertex_arrays = raw.vertex_arrays;
	if (raw.skin != null) {
		vertex_arrays.push({ attrib: "bone", values: null, data: "short4norm" });
		vertex_arrays.push({ attrib: "weight", values: null, data: "short4norm" });
	}
	for (let i = 0; i < vertex_arrays.length; ++i) {
		let padding = vertex_arrays[i].padding != null ? vertex_arrays[i].padding : 0;
		vertex_arrays[i]._size = mesh_data_get_vertex_size(vertex_arrays[i].data, padding);
	}

	if (raw.skin != null) {
		let bonea = null;
		let weighta = null;
		let vertex_length = Math.floor(vertex_arrays[0].values.length / vertex_arrays[0]._size);
		let l = vertex_length * 4;
		bonea = new Int16Array(l);
		weighta = new Int16Array(l);

		let index = 0;
		let ai = 0;
		for (let i = 0; i < vertex_length; ++i) {
			let bone_count = raw.skin.bone_count_array[i];
			for (let j = index; j < index + bone_count; ++j) {
				bonea[ai] = raw.skin.bone_index_array[j];
				weighta[ai] = raw.skin.bone_weight_array[j];
				ai++;
			}
			// Fill unused weights
			for (let j = bone_count; j < 4; ++j) {
				bonea[ai] = 0;
				weighta[ai] = 0;
				ai++;
			}
			index += bone_count;
		}
		vertex_arrays[vertex_arrays.length - 2].values = bonea;
		vertex_arrays[vertex_arrays.length - 1].values = weighta;
	}

	// Make vertex buffers
	raw._indices = indices;
	raw._material_indices = material_indices;
	raw._struct = mesh_data_get_vertex_struct(raw.vertex_arrays);

	done(raw);
}

function mesh_data_get_vertex_struct(vertex_arrays: vertex_array_t[]): vertex_struct_t {
	let structure = vertex_struct_create();
	for (let i = 0; i < vertex_arrays.length; ++i) {
		vertex_struct_add(structure, vertex_arrays[i].attrib, mesh_data_get_vertex_data(vertex_arrays[i].data));
	}
	return structure;
}

function mesh_data_get_vertex_data(data: string): VertexData {
	switch (data) {
		case "short4norm": return VertexData.I16_4X_Normalized;
		case "short2norm": return VertexData.I16_2X_Normalized;
		default: return VertexData.I16_4X_Normalized;
	}
}

function mesh_data_build_vertices(vertices: DataView, vertex_arrays: vertex_array_t[], offset = 0, fake_uvs = false, uvs_index = -1) {
	let num_verts = vertex_arrays[0].values.length / vertex_arrays[0]._size;
	let di = -1 + offset;
	for (let i = 0; i < num_verts; ++i) {
		for (let va = 0; va < vertex_arrays.length; ++va) {
			let l = vertex_arrays[va]._size;
			if (fake_uvs && va == uvs_index) { // Add fake uvs if uvs where "asked" for but not found
				for (let j = 0; j < l; ++j) vertices.setInt16(++di * 2, 0, true);
				continue;
			}
			for (let o  = 0; o < l; ++o) {
				vertices.setInt16(++di * 2, vertex_arrays[va].values[i * l + o], true);
			}
			if (vertex_arrays[va].padding != null) {
				if (vertex_arrays[va].padding == 1) {
					vertices.setInt16(++di * 2, 0, true);
				}
			}
		}
	}
}

function mesh_data_get_vertex_size(vertex_data: string, padding: i32 = 0): i32 {
	switch (vertex_data) {
		case "short4norm": return 4 - padding;
		case "short2norm": return 2 - padding;
		default: return 0;
	}
}

function mesh_data_get_vertex_array(raw: mesh_data_t, name: string): vertex_array_t {
	for (let i = 0; i < raw.vertex_arrays.length; ++i) {
		if (raw.vertex_arrays[i].attrib == name) {
			return raw.vertex_arrays[i];
		}
	}
	return null;
}

function mesh_data_setup_inst(raw: mesh_data_t, data: Float32Array, inst_type: i32) {
	let structure = vertex_struct_create();
	structure.instanced = true;
	raw._instanced = true;
	// pos, pos+rot, pos+scale, pos+rot+scale
	vertex_struct_add(structure, "ipos", VertexData.F32_3X);
	if (inst_type == 2 || inst_type == 4) {
		vertex_struct_add(structure, "irot", VertexData.F32_3X);
	}
	if (inst_type == 3 || inst_type == 4) {
		vertex_struct_add(structure, "iscl", VertexData.F32_3X);
	}

	raw._instance_count = Math.floor(data.length / Math.floor(vertex_struct_byte_size(structure) / 4));
	raw._instanced_vb = vertex_buffer_create(raw._instance_count, structure, Usage.StaticUsage, 1);
	let vertices = vertex_buffer_lock(raw._instanced_vb);
	for (let i = 0; i < Math.floor(vertices.byteLength / 4); ++i) vertices.setFloat32(i * 4, data[i], true);
	vertex_buffer_unlock(raw._instanced_vb);
}

function mesh_data_get(raw: mesh_data_t, vs: vertex_element_t[]): vertex_buffer_t {
	let key = "";
	for (let e of vs) key += e.name;
	let vb = raw._vertex_buffer_map.get(key);
	if (vb == null) {
		let vertex_arrays = [];
		let has_tex = false;
		let tex_offset = -1;
		let has_col = false;
		for (let e = 0; e < vs.length; ++e) {
			if (vs[e].name == "tex") {
				has_tex = true;
				tex_offset = e;
			}
			if (vs[e].name == "col") {
				has_col = true;
			}
			for (let va = 0; va < raw.vertex_arrays.length; ++va) {
				if (vs[e].name == raw.vertex_arrays[va].attrib) {
					vertex_arrays.push(raw.vertex_arrays[va]);
				}
			}
		}
		// Multi-mat mesh with different vertex structures
		let positions = mesh_data_get_vertex_array(raw, 'pos');
		let uvs = mesh_data_get_vertex_array(raw, 'tex');
		let cols = mesh_data_get_vertex_array(raw, 'col');
		let struct = mesh_data_get_vertex_struct(vertex_arrays);
		vb = vertex_buffer_create(Math.floor(positions.values.length / positions._size), struct, Usage.StaticUsage);
		raw._vertices = vertex_buffer_lock(vb);
		mesh_data_build_vertices(raw._vertices, vertex_arrays, 0, has_tex && uvs == null, tex_offset);
		vertex_buffer_unlock(vb);
		raw._vertex_buffer_map.set(key, vb);
		if (has_tex && uvs == null) Krom.log("Armory Warning: Geometry " + raw.name + " is missing UV map");
		if (has_col && cols == null) Krom.log("Armory Warning: Geometry " + raw.name + " is missing vertex colors");
	}
	return vb;
}

function mesh_data_build(raw: mesh_data_t) {
	if (raw._ready) return;

	let positions = mesh_data_get_vertex_array(raw, 'pos');
	raw._vertex_buffer = vertex_buffer_create(Math.floor(positions.values.length / positions._size), raw._struct, Usage.StaticUsage);
	raw._vertices = vertex_buffer_lock(raw._vertex_buffer);
	mesh_data_build_vertices(raw._vertices, raw.vertex_arrays);
	vertex_buffer_unlock(raw._vertex_buffer);

	let struct_str = "";
	for (let e of raw._struct.elements) struct_str += e.name;
	raw._vertex_buffer_map.set(struct_str, raw._vertex_buffer);

	raw._index_buffers = [];
	for (let id of raw._indices) {
		if (id.length == 0) continue;
		let index_buffer = index_buffer_create(id.length);

		let indices_array = index_buffer_lock(index_buffer);
		for (let i = 0; i < indices_array.length; ++i) indices_array[i] = id[i];

		index_buffer_unlock(index_buffer);
		raw._index_buffers.push(index_buffer);
	}

	// Instanced
	if (raw.instanced_data != null) mesh_data_setup_inst(raw, raw.instanced_data, raw.instanced_type);

	raw._ready = true;
}

///if arm_skin
function mesh_data_add_armature(raw: mesh_data_t, armature: armature_t) {
	for (let a of armature.actions) {
		mesh_data_add_action(raw, a.bones, a.name);
	}
}

function mesh_data_add_action(raw: mesh_data_t, bones: obj_t[], name: string) {
	if (bones == null) return;
	if (raw._actions == null) {
		raw._actions = new Map();
		raw._mats = new Map();
	}
	if (raw._actions.get(name) != null) return;
	let action_bones: obj_t[] = [];

	// Set bone references
	for (let s of raw.skin.bone_ref_array) {
		for (let b of bones) {
			if (b.name == s) {
				action_bones.push(b);
			}
		}
	}
	raw._actions.set(name, action_bones);

	let action_mats: mat4_t[] = [];
	for (let b of action_bones) {
		action_mats.push(mat4_from_f32_array(b.transform.values));
	}
	raw._mats.set(name, action_mats);
}

function mesh_data_init_skeleton_transforms(raw: mesh_data_t, transforms_inv: Float32Array[]) {
	raw._skeleton_transforms_inv = [];
	for (let t of transforms_inv) {
		let mi = mat4_from_f32_array(t);
		raw._skeleton_transforms_inv.push(mi);
	}
}
///end

function mesh_data_calculate_aabb(raw: mesh_data_t): vec4_t {
	let aabb_min = vec4_create(-0.01, -0.01, -0.01);
	let aabb_max = vec4_create(0.01, 0.01, 0.01);
	let aabb = vec4_create();
	let i = 0;
	let positions = mesh_data_get_vertex_array(raw, 'pos');
	while (i < positions.values.length) {
		if (positions.values[i    ] > aabb_max.x) aabb_max.x = positions.values[i];
		if (positions.values[i + 1] > aabb_max.y) aabb_max.y = positions.values[i + 1];
		if (positions.values[i + 2] > aabb_max.z) aabb_max.z = positions.values[i + 2];
		if (positions.values[i    ] < aabb_min.x) aabb_min.x = positions.values[i];
		if (positions.values[i + 1] < aabb_min.y) aabb_min.y = positions.values[i + 1];
		if (positions.values[i + 2] < aabb_min.z) aabb_min.z = positions.values[i + 2];
		i += 4;
	}
	aabb.x = (Math.abs(aabb_min.x) + Math.abs(aabb_max.x)) / 32767 * raw.scale_pos;
	aabb.y = (Math.abs(aabb_min.y) + Math.abs(aabb_max.y)) / 32767 * raw.scale_pos;
	aabb.z = (Math.abs(aabb_min.z) + Math.abs(aabb_max.z)) / 32767 * raw.scale_pos;
	return aabb;
}

function mesh_data_delete(raw: mesh_data_t) {
	for (let buf of raw._vertex_buffer_map.values()) {
		if (buf != null) {
			vertex_buffer_delete(buf);
		}
	}
	for (let buf of raw._index_buffers) {
		index_buffer_delete(buf);
	}
}