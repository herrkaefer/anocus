---
title: "CLASS Style Adapted for Embedded Systems"
date: "2016-09-10T00:00:00"
summary: "The heavy reliance on heap memory makes CLASS unsuitable for embedded systems where all memory use must be static. How should we improve this?"
tags: "['embedded', 'C', 'blog']"
categories: ["C"]
lastmod: 2018-05-05
comments: true
draft: false
---

## CLASS C Coding style

[CLASS](http://rfc.zeromq.org/spec:21/CLASS/) is "C Language Style for Scalability" developed by Pieter Hintjens:

>The C Language Style for Scalability (CLASS) defines a consistent style and organization for scalable C library and application code built on modern C compilers and operating systems. CLASS aims to collect industry best practice into one reusable standard.

CLASS is all about writing APIs. Types and functions are grouped by tasks. I have used this style to write C codes after reading the unfinished book ["Scalable C"](https://www.gitbook.com/book/hintjens/scalable-c/details), and it makes writing C code a great fun.

## Problem

Recently I am developing some algorithms in C targeted at embedded system where static memory is used instead of dynamic heap memory. So I tried to adapt the CLASS style to the embedded version.

To avoid use of heap memory, we need to re-consider the following issues:

- How to create object with adjustable parameters?
- How to initialize object with parameters?
- How to return memory block in APIs?

Below is my initial solution.


## CLASS for Embedded System (CLASSES)

I wrote a skeleton project for demonstration purpose. [embedded-c-boilerplate <i class="fa fa-github"></i>](https://github.com/herrkaefer/embedded-c-boilerplate). The following of this post is basically explanations of the codes. Let's take a `buffer` class for example.

### Parameter configuration with a separate header file

Instead of creating object dynamically with input parameters in `new()`, we turn to use macros to define parameters in advance.

For each class, use a separate `myclass.ini` file to allow the class user to define parameters to configure the object. These parameters are essential to object creation and initialization.

For example, in `buffer.ini`:

```c
#define BUFFER_SIZE 128
#define BUFFER_PARAM_A 1
#define BUFFER_PARAM_B 9.4
```

You can comment any line to use the default value. Default values are defined in .h file (explained bellow).

Then include this file before the class header file.

This approach is invasive because if you change parameters recompiling is necessary. However, it is still helpful for separating configuration from code. You could change parameters without going deeply into the class implementations.

### Parameter regularization

For each parameter essential to object creation and initialization:

1. Define **default parameter** which can be overrided by user defined value in cfg file (the .ini file).
2. Typecast it to **inner representation** prefixed by a underscore.
3. Perform **static assertion** to verify that the value is within correct range.

These are done in the class header. For the buffer example, in `buffer.h`:

```c
#include "buffer.ini"

#ifndef BUFFER_SIZE
#define BUFFER_SIZE 32
#endif
#define _BUFFER_SIZE (size_t) BUFFER_SIZE
ct_assert (_BUFFER_SIZE <= 1024);

#ifndef BUFFER_PARAM_A
#define BUFFER_PARAM_A 2
#endif
#define _BUFFER_PARAM_A (int) BUFFER_PARAM_A
ct_assert (_BUFFER_PARAM_A <= 3);

#ifndef BUFFER_PARAM_B
#define BUFFER_PARAM_B 7.0
#endif
#define _BUFFER_PARAM_B (double) BUFFER_PARAM_B
ct_assert (_BUFFER_PARAM_B < 10.0);
```

`ct_assert` macro does compile-time assertion of to verify that the parameter is within the correct range, which is defined as below:

```c
#define ct_assert3(COND,MSG) typedef char static_assertion_failed_at_line_##MSG[(!!(COND))*2-1]
#define ct_assert2(COND,MSG) ct_assert3(COND,MSG)
#define ct_assert(COND) ct_assert2(COND,__LINE__)
```

From this step on, we will use parameters with inner representations (for structure defination and `init()`, see bellow), e.g.`_BUFFER_SIZE` instead of `BUFFER_SIZE`.

### Data structure defination

Structure defination has to be public in the header file, as for embedded application, object is instantiated statically, and the compiler needs to know its size.

This is the `buffer_t` structure:

```c
typedef struct {
    double data[_BUFFER_SIZE];
    size_t size;
    int param_a;
    double param_b;
} buffer_t;
```

Note that `buffer_t` is a new defined struct type. To instantiate it, or define a variable:

```c
buffer_t buffer;
```

### Object initialization

Constructor `new()` and destructor `free()` or `destroy()` are no longer needed. Instead, a `init()` API is added for initializing object, e.g.

```c
// Initialize buffer object
void buffer_init (buffer_t *self);
```

In `init()`, we

- Use parameters with **inner representation** (e.g. `_BUFFER_SIZE`) to initialize corresponding properties.
- Assign parameter to variable if you need to access it later. **The idea is: using of parameter macros should stop after `init()`. In other APIs, we do not see the macros any more.** Instead, we use the parameter variables. Of course, this approach will cost a little more memory than using macros directly.
- For other properties, try to initialize them to default values (0/false/NULL)

`init()` should be called once before you use the object.

For example,

```c
void buffer_init (buffer_t *self) {
    assert (self);
    memset (self, 0, _BUFFER_SIZE * sizeof (double));
    self->size = _BUFFER_SIZE;
    self->param_a = _BUFFER_PARAM_A;
    self->param_b = _BUFFER_PARAM_B;
}
```

## APIs design guide

### Naming conventions

This is the same as in CLASS style. Every API should accept the pointer of the object as the first parameter, followed by other parameters:

```c
myclass_mymethod (myobject, ...)
```

### Initialization

```c
void myclass_init (myclass_t *self);
```

Constructor (`new()`, or `create()`) and destructor (`free()` or `destroy()`) are no longer needed. Instead we add a `init()` to do initilization works, which has been explained above.

Initialize the object once before you use it:

```c
myclass myobject;
myclass_init (&myobject);
```

### Getter and setter

Though you can manipulate properties directly as the structure is public, doing these via getter and setter APIs are recommended. You should **pretend** that the structure implementation is hidden, and never manipulate properties directly.

It is not necessary to write getter and setter for every property. For const properties, do not provide a setter.

### Other APIs

APIs for real works, e.g.

```c
void buffer_push (buffer_t *self, double value);
```

### No heap memory allocation

- Avoid using dynamic memory allocation, e.g. `malloc()` or `alloc()`
- To return memory block, use **inout parameter** rather than memory block dynamically allocated inside the function.

For example, to calculate the squared root of every element in a buffer, we write a function as:

```c
void buffer_sqrt (buffer_t *self, double *output) {
    assert (self);
    assert (output);
    for (size_t idx = 0; idx < self->size; idx++)
        output[idx] = sqrt (self->data[idx]);
}
```

It is better to indicate the inout parameter by name such as **"output"** in the API declaration, and note it in the comment.

```c
// Squared root of buffer data.
// Return result in param output.
void buffer_sqrt (buffer_t *self, double *output);
```


## Problems and limitations

### Same class defination, multiple configuraton

For example, you need two buffers with different length in a program. It seems not easy to realize if the configuration is related to memory allocation, which is done during compiling stage. Buffers with differnt length should actually be viewed as instances of different classes.

### Building and using libraries