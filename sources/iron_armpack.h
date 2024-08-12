
// .arm file format parser
// msgpack with typed arrays

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "iron_array.h"

#ifdef __GNUC__
#define PACK(__Declaration__) __Declaration__ __attribute__((__packed__))
#endif

#ifdef _MSC_VER
#define PACK(__Declaration__) __pragma(pack(push, 1)) __Declaration__ __pragma(pack(pop))
#endif

void *armpack_decode(buffer_t *b);

void armpack_encode_start(void *encoded);
int armpack_encode_end();
void armpack_encode_map(uint32_t count);
void armpack_encode_array(uint32_t count);
void armpack_encode_array_f32(f32_array_t *f32a);
void armpack_encode_array_i32(i32_array_t *i32a);
void armpack_encode_array_i16(i16_array_t *i16a);
void armpack_encode_array_u8(u8_array_t *u8a);
void armpack_encode_array_string(char_ptr_array_t *strings);
void armpack_encode_string(char *str);
void armpack_encode_i32(int32_t i);
void armpack_encode_f32(float f);
void armpack_encode_bool(bool b);
void armpack_encode_null();

int armpack_size_map();
int armpack_size_array();
int armpack_size_array_f32(f32_array_t *f32a);
int armpack_size_array_u8(u8_array_t *u8a);
int armpack_size_string(char *str);
int armpack_size_i32();
int armpack_size_f32();
int armpack_size_bool();

/* JS object:

	let test = {
		name: "test",
		point: { x: 2, y: 4 },
		array: i32_array_create([1, 2, 3])
	};
*/

/* C struct:

	typedef PACK(struct point {
		int x;
		int y;
	}) point_t;

	typedef PACK(struct test {
		char *name;
		point_t point;
		int32_array_t *array;
		// Optional pointer for storing runtime data
		void *_;
	}) test_t;
*/

/*
	void encode_decode_test() {
		point_t a;
		a.x = 3;
		a.y = 9;

		uint32_t size = 0;
		size += armpack_size_map();
		size += armpack_size_string("x");
		size += armpack_size_i32();
		size += armpack_size_string("y");
		size += armpack_size_i32();

		void *encoded = malloc(size);
		armpack_encode_start(encoded);
		armpack_encode_map(2);
		armpack_encode_string("x");
		armpack_encode_i32(a.x);
		armpack_encode_string("y");
		armpack_encode_i32(a.y);

		buffer_t b = { .buffer = encoded, .length = size };
		point_t *decoded = armpack_decode(b);
	}
*/