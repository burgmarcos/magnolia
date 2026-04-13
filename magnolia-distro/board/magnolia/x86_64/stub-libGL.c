/* Stub libGL.so.1 v3 — returns GL 2.1 with NPOT texture support.
   Satisfies WebKitGTK initialization so it can render via Cairo/software.
   All draw calls are noops but initialization queries return valid values.

   Build: ${CROSS_COMPILE}gcc -shared -o libGL.so.1.0.0 stub-libGL.c -Wl,-soname,libGL.so.1
*/
#include <stddef.h>

typedef unsigned int GLenum;
typedef unsigned int GLuint;
typedef int GLint;
typedef int GLsizei;
typedef unsigned char GLubyte;
typedef float GLfloat;
typedef unsigned int GLbitfield;
typedef long GLsizeiptr;
typedef long GLintptr;

#define GL_NO_ERROR                 0
#define GL_VERSION                  0x1F02
#define GL_RENDERER                 0x1F01
#define GL_VENDOR                   0x1F00
#define GL_EXTENSIONS               0x1F03
#define GL_SHADING_LANGUAGE_VERSION 0x8B8C
#define GL_MAX_TEXTURE_SIZE         0x0D33
#define GL_MAX_VIEWPORT_DIMS        0x0D3A
#define GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS 0x8B4D
#define GL_MAX_TEXTURE_IMAGE_UNITS  0x8872
#define GL_MAX_VERTEX_ATTRIBS       0x8869
#define GL_MAX_RENDERBUFFER_SIZE    0x84E8
#define GL_LINK_STATUS              0x8B82
#define GL_COMPILE_STATUS           0x8B81
#define GL_VALIDATE_STATUS          0x8B83
#define GL_INFO_LOG_LENGTH          0x8B84
#define GL_FRAMEBUFFER_COMPLETE     0x8CD5

static const GLubyte version[] = "2.1 Mesa 26.0.4 (Magnolia Softpipe)";
static const GLubyte renderer[] = "Magnolia Software Rasterizer";
static const GLubyte vendor[] = "Mesa Project";
static const GLubyte glsl_version[] = "1.20";
static const GLubyte extensions[] =
    "GL_ARB_texture_non_power_of_two "
    "GL_ARB_framebuffer_object "
    "GL_ARB_vertex_shader "
    "GL_ARB_fragment_shader "
    "GL_ARB_shader_objects "
    "GL_ARB_shading_language_100 "
    "GL_EXT_framebuffer_object "
    "GL_ARB_multitexture "
    "GL_EXT_blend_func_separate ";

const GLubyte *glGetString(GLenum name) {
    switch (name) {
        case GL_VERSION: return version;
        case GL_RENDERER: return renderer;
        case GL_VENDOR: return vendor;
        case GL_EXTENSIONS: return extensions;
        case GL_SHADING_LANGUAGE_VERSION: return glsl_version;
        default: return (const GLubyte *)"";
    }
}

GLenum glGetError(void) { return GL_NO_ERROR; }

void glGetIntegerv(GLenum pname, GLint *params) {
    if (!params) return;
    switch (pname) {
        case GL_MAX_TEXTURE_SIZE: *params = 8192; break;
        case GL_MAX_VIEWPORT_DIMS: params[0] = 8192; params[1] = 8192; break;
        case GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS: *params = 16; break;
        case GL_MAX_TEXTURE_IMAGE_UNITS: *params = 16; break;
        case GL_MAX_VERTEX_ATTRIBS: *params = 16; break;
        case GL_MAX_RENDERBUFFER_SIZE: *params = 8192; break;
        default: *params = 0; break;
    }
}

void glGetBooleanv(GLenum p, unsigned char *v) { if(v) *v = 0; (void)p; }
void glGetFloatv(GLenum p, GLfloat *v) { if(v) *v = 0.0f; (void)p; }
void glEnable(GLenum c) { (void)c; }
void glDisable(GLenum c) { (void)c; }
unsigned char glIsEnabled(GLenum c) { (void)c; return 0; }
void glClear(GLbitfield m) { (void)m; }
void glClearColor(GLfloat r, GLfloat g, GLfloat b, GLfloat a) { (void)r;(void)g;(void)b;(void)a; }
void glViewport(GLint x, GLint y, GLsizei w, GLsizei h) { (void)x;(void)y;(void)w;(void)h; }
void glFlush(void) {}
void glFinish(void) {}
void glBindTexture(GLenum t, GLuint x) { (void)t;(void)x; }
void glGenTextures(GLsizei n, GLuint *t) { if(t) for(GLsizei i=0;i<n;i++) t[i]=i+1; }
void glDeleteTextures(GLsizei n, const GLuint *t) { (void)n;(void)t; }
void glActiveTexture(GLenum t) { (void)t; }
void glBlendFunc(GLenum s, GLenum d) { (void)s;(void)d; }
void glBlendFuncSeparate(GLenum a, GLenum b, GLenum c, GLenum d) { (void)a;(void)b;(void)c;(void)d; }
void glBlendEquation(GLenum m) { (void)m; }
void glBlendEquationSeparate(GLenum a, GLenum b) { (void)a;(void)b; }
void glScissor(GLint x, GLint y, GLsizei w, GLsizei h) { (void)x;(void)y;(void)w;(void)h; }
void glPixelStorei(GLenum p, GLint v) { (void)p;(void)v; }
void glReadPixels(GLint x, GLint y, GLsizei w, GLsizei h, GLenum f, GLenum t, void *d) { (void)x;(void)y;(void)w;(void)h;(void)f;(void)t;(void)d; }
void glTexImage2D(GLenum t, GLint l, GLint i, GLsizei w, GLsizei h, GLint b, GLenum f, GLenum ty, const void *d) { (void)t;(void)l;(void)i;(void)w;(void)h;(void)b;(void)f;(void)ty;(void)d; }
void glTexSubImage2D(GLenum t, GLint l, GLint x, GLint y, GLsizei w, GLsizei h, GLenum f, GLenum ty, const void *d) { (void)t;(void)l;(void)x;(void)y;(void)w;(void)h;(void)f;(void)ty;(void)d; }
void glTexParameteri(GLenum t, GLenum p, GLint v) { (void)t;(void)p;(void)v; }
void glTexParameterf(GLenum t, GLenum p, GLfloat v) { (void)t;(void)p;(void)v; }
void glGenerateMipmap(GLenum t) { (void)t; }
GLuint glCreateProgram(void) { return 1; }
GLuint glCreateShader(GLenum t) { (void)t; return 1; }
void glUseProgram(GLuint p) { (void)p; }
void glShaderSource(GLuint s, GLsizei c, const char **str, const GLint *l) { (void)s;(void)c;(void)str;(void)l; }
void glCompileShader(GLuint s) { (void)s; }
void glAttachShader(GLuint p, GLuint s) { (void)p;(void)s; }
void glDetachShader(GLuint p, GLuint s) { (void)p;(void)s; }
void glLinkProgram(GLuint p) { (void)p; }
void glValidateProgram(GLuint p) { (void)p; }
void glDeleteShader(GLuint s) { (void)s; }
void glDeleteProgram(GLuint p) { (void)p; }
void glGetProgramiv(GLuint p, GLenum n, GLint *v) {
    if (!v) return;
    if (n == GL_LINK_STATUS || n == GL_VALIDATE_STATUS) *v = 1;
    else if (n == GL_INFO_LOG_LENGTH) *v = 0;
    else *v = 0;
    (void)p;
}
void glGetShaderiv(GLuint s, GLenum n, GLint *v) {
    if (!v) return;
    if (n == GL_COMPILE_STATUS) *v = 1;
    else if (n == GL_INFO_LOG_LENGTH) *v = 0;
    else *v = 0;
    (void)s;
}
void glGetProgramInfoLog(GLuint p, GLsizei m, GLsizei *l, char *log) { if(l) *l=0; if(log&&m>0) log[0]=0; (void)p; }
void glGetShaderInfoLog(GLuint s, GLsizei m, GLsizei *l, char *log) { if(l) *l=0; if(log&&m>0) log[0]=0; (void)s; }
GLint glGetUniformLocation(GLuint p, const char *n) { (void)p;(void)n; return 0; }
GLint glGetAttribLocation(GLuint p, const char *n) { (void)p;(void)n; return 0; }
void glBindAttribLocation(GLuint p, GLuint i, const char *n) { (void)p;(void)i;(void)n; }
void glUniform1i(GLint l, GLint v) { (void)l;(void)v; }
void glUniform1f(GLint l, GLfloat v) { (void)l;(void)v; }
void glUniform2f(GLint l, GLfloat a, GLfloat b) { (void)l;(void)a;(void)b; }
void glUniform3f(GLint l, GLfloat a, GLfloat b, GLfloat c) { (void)l;(void)a;(void)b;(void)c; }
void glUniform4f(GLint l, GLfloat a, GLfloat b, GLfloat c, GLfloat d) { (void)l;(void)a;(void)b;(void)c;(void)d; }
void glUniformMatrix4fv(GLint l, GLsizei c, unsigned char t, const GLfloat *v) { (void)l;(void)c;(void)t;(void)v; }
void glGenFramebuffers(GLsizei n, GLuint *f) { if(f) for(GLsizei i=0;i<n;i++) f[i]=i+1; }
void glBindFramebuffer(GLenum t, GLuint f) { (void)t;(void)f; }
void glDeleteFramebuffers(GLsizei n, const GLuint *f) { (void)n;(void)f; }
GLenum glCheckFramebufferStatus(GLenum t) { (void)t; return GL_FRAMEBUFFER_COMPLETE; }
void glFramebufferTexture2D(GLenum t, GLenum a, GLenum tt, GLuint tex, GLint l) { (void)t;(void)a;(void)tt;(void)tex;(void)l; }
void glGenRenderbuffers(GLsizei n, GLuint *r) { if(r) for(GLsizei i=0;i<n;i++) r[i]=i+1; }
void glBindRenderbuffer(GLenum t, GLuint r) { (void)t;(void)r; }
void glRenderbufferStorage(GLenum t, GLenum f, GLsizei w, GLsizei h) { (void)t;(void)f;(void)w;(void)h; }
void glFramebufferRenderbuffer(GLenum t, GLenum a, GLenum rt, GLuint r) { (void)t;(void)a;(void)rt;(void)r; }
void glDeleteRenderbuffers(GLsizei n, const GLuint *r) { (void)n;(void)r; }
void glGenBuffers(GLsizei n, GLuint *b) { if(b) for(GLsizei i=0;i<n;i++) b[i]=i+1; }
void glBindBuffer(GLenum t, GLuint b) { (void)t;(void)b; }
void glBufferData(GLenum t, GLsizeiptr s, const void *d, GLenum u) { (void)t;(void)s;(void)d;(void)u; }
void glBufferSubData(GLenum t, GLintptr o, GLsizeiptr s, const void *d) { (void)t;(void)o;(void)s;(void)d; }
void glDeleteBuffers(GLsizei n, const GLuint *b) { (void)n;(void)b; }
void glEnableVertexAttribArray(GLuint i) { (void)i; }
void glDisableVertexAttribArray(GLuint i) { (void)i; }
void glVertexAttribPointer(GLuint i, GLint s, GLenum t, unsigned char n, GLsizei st, const void *p) { (void)i;(void)s;(void)t;(void)n;(void)st;(void)p; }
void glDrawArrays(GLenum m, GLint f, GLsizei c) { (void)m;(void)f;(void)c; }
void glDrawElements(GLenum m, GLsizei c, GLenum t, const void *i) { (void)m;(void)c;(void)t;(void)i; }
void glGenVertexArrays(GLsizei n, GLuint *a) { if(a) for(GLsizei i=0;i<n;i++) a[i]=i+1; }
void glBindVertexArray(GLuint a) { (void)a; }
void glDeleteVertexArrays(GLsizei n, const GLuint *a) { (void)n;(void)a; }
void glColorMask(unsigned char r, unsigned char g, unsigned char b, unsigned char a) { (void)r;(void)g;(void)b;(void)a; }
void glDepthFunc(GLenum f) { (void)f; }
void glDepthMask(unsigned char f) { (void)f; }
void glStencilFunc(GLenum f, GLint r, GLuint m) { (void)f;(void)r;(void)m; }
void glStencilOp(GLenum s, GLenum d, GLenum p) { (void)s;(void)d;(void)p; }
void glStencilMask(GLuint m) { (void)m; }
void glLineWidth(GLfloat w) { (void)w; }
void glHint(GLenum t, GLenum m) { (void)t;(void)m; }
