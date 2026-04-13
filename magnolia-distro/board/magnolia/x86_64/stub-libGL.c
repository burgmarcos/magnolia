/* Functional stub libGL.so.1 — provides minimal GL API so WebKitGTK
   can initialize without SIGABRT, then fall back to its software path.

   WebKitGTK unconditionally dlopen()s libGL.so.1 on Linux and crashes
   if not found. On Wayland-only systems without X11/GLX, mesa does not
   build libGL.so. This stub satisfies the dlopen and provides enough
   GL state for WebKit to detect "GL 2.1" and proceed to its Cairo
   software rendering fallback.

   Build: ${CROSS_COMPILE}gcc -shared -o libGL.so.1.0.0 stub-libGL.c -Wl,-soname,libGL.so.1
*/
#include <stddef.h>

typedef unsigned int GLenum;
typedef unsigned int GLuint;
typedef int GLint;
typedef int GLsizei;
typedef unsigned char GLubyte;
typedef float GLfloat;
typedef double GLdouble;
typedef unsigned int GLbitfield;
typedef void GLvoid;

#define GL_VERSION                  0x1F02
#define GL_RENDERER                 0x1F01
#define GL_VENDOR                   0x1F00
#define GL_EXTENSIONS               0x1F03
#define GL_SHADING_LANGUAGE_VERSION 0x8B8C
#define GL_NO_ERROR                 0
#define GL_MAX_TEXTURE_SIZE         0x0D33
#define GL_MAX_VIEWPORT_DIMS        0x0D3A

static const GLubyte version[] = "2.1 Mesa Stub";
static const GLubyte renderer[] = "Magnolia Software Renderer";
static const GLubyte vendor[] = "Mesa";
static const GLubyte extensions[] = "";
static const GLubyte glsl_version[] = "1.20";

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
        case GL_MAX_TEXTURE_SIZE: *params = 4096; break;
        case GL_MAX_VIEWPORT_DIMS: params[0] = 4096; params[1] = 4096; break;
        default: *params = 0; break;
    }
}

void glEnable(GLenum cap) { (void)cap; }
void glDisable(GLenum cap) { (void)cap; }
void glClear(GLbitfield mask) { (void)mask; }
void glClearColor(GLfloat r, GLfloat g, GLfloat b, GLfloat a) { (void)r; (void)g; (void)b; (void)a; }
void glViewport(GLint x, GLint y, GLsizei w, GLsizei h) { (void)x; (void)y; (void)w; (void)h; }
void glFlush(void) {}
void glFinish(void) {}
void glBindTexture(GLenum target, GLuint tex) { (void)target; (void)tex; }
void glGenTextures(GLsizei n, GLuint *textures) { if (textures) for (GLsizei i=0; i<n; i++) textures[i] = i+1; }
void glDeleteTextures(GLsizei n, const GLuint *textures) { (void)n; (void)textures; }
void glTexImage2D(GLenum t, GLint l, GLint i, GLsizei w, GLsizei h, GLint b, GLenum f, GLenum ty, const void *d) { (void)t;(void)l;(void)i;(void)w;(void)h;(void)b;(void)f;(void)ty;(void)d; }
void glTexParameteri(GLenum t, GLenum p, GLint v) { (void)t; (void)p; (void)v; }
void glBlendFunc(GLenum s, GLenum d) { (void)s; (void)d; }
void glPixelStorei(GLenum p, GLint v) { (void)p; (void)v; }
void glReadPixels(GLint x, GLint y, GLsizei w, GLsizei h, GLenum f, GLenum t, void *d) { (void)x;(void)y;(void)w;(void)h;(void)f;(void)t;(void)d; }
void glScissor(GLint x, GLint y, GLsizei w, GLsizei h) { (void)x;(void)y;(void)w;(void)h; }
void glActiveTexture(GLenum t) { (void)t; }
void glBlendFuncSeparate(GLenum a, GLenum b, GLenum c, GLenum d) { (void)a;(void)b;(void)c;(void)d; }
void glUseProgram(GLuint p) { (void)p; }
GLuint glCreateProgram(void) { return 1; }
GLuint glCreateShader(GLenum t) { (void)t; return 1; }
void glShaderSource(GLuint s, GLsizei c, const char **str, const GLint *l) { (void)s;(void)c;(void)str;(void)l; }
void glCompileShader(GLuint s) { (void)s; }
void glAttachShader(GLuint p, GLuint s) { (void)p; (void)s; }
void glLinkProgram(GLuint p) { (void)p; }
void glDeleteShader(GLuint s) { (void)s; }
void glDeleteProgram(GLuint p) { (void)p; }
void glGetProgramiv(GLuint p, GLenum n, GLint *v) { if(v) *v = 1; (void)p; (void)n; }
void glGetShaderiv(GLuint s, GLenum n, GLint *v) { if(v) *v = 1; (void)s; (void)n; }
GLint glGetUniformLocation(GLuint p, const char *n) { (void)p; (void)n; return -1; }
GLint glGetAttribLocation(GLuint p, const char *n) { (void)p; (void)n; return -1; }
void glUniform1i(GLint l, GLint v) { (void)l; (void)v; }
void glUniform1f(GLint l, GLfloat v) { (void)l; (void)v; }
void glGenFramebuffers(GLsizei n, GLuint *f) { if(f) for(GLsizei i=0;i<n;i++) f[i]=i+1; }
void glBindFramebuffer(GLenum t, GLuint f) { (void)t; (void)f; }
void glDeleteFramebuffers(GLsizei n, const GLuint *f) { (void)n; (void)f; }
GLenum glCheckFramebufferStatus(GLenum t) { (void)t; return 0x8CD5; /* GL_FRAMEBUFFER_COMPLETE */ }
void glFramebufferTexture2D(GLenum t, GLenum a, GLenum tt, GLuint tex, GLint l) { (void)t;(void)a;(void)tt;(void)tex;(void)l; }
void glGenRenderbuffers(GLsizei n, GLuint *r) { if(r) for(GLsizei i=0;i<n;i++) r[i]=i+1; }
void glBindRenderbuffer(GLenum t, GLuint r) { (void)t; (void)r; }
void glRenderbufferStorage(GLenum t, GLenum f, GLsizei w, GLsizei h) { (void)t;(void)f;(void)w;(void)h; }
void glFramebufferRenderbuffer(GLenum t, GLenum a, GLenum rt, GLuint r) { (void)t;(void)a;(void)rt;(void)r; }
void glDeleteRenderbuffers(GLsizei n, const GLuint *r) { (void)n; (void)r; }
void glGenBuffers(GLsizei n, GLuint *b) { if(b) for(GLsizei i=0;i<n;i++) b[i]=i+1; }
void glBindBuffer(GLenum t, GLuint b) { (void)t; (void)b; }
void glBufferData(GLenum t, long s, const void *d, GLenum u) { (void)t;(void)s;(void)d;(void)u; }
void glDeleteBuffers(GLsizei n, const GLuint *b) { (void)n; (void)b; }
void glEnableVertexAttribArray(GLuint i) { (void)i; }
void glDisableVertexAttribArray(GLuint i) { (void)i; }
void glVertexAttribPointer(GLuint i, GLint s, GLenum t, unsigned char n, GLsizei st, const void *p) { (void)i;(void)s;(void)t;(void)n;(void)st;(void)p; }
void glDrawArrays(GLenum m, GLint f, GLsizei c) { (void)m;(void)f;(void)c; }
void glDrawElements(GLenum m, GLsizei c, GLenum t, const void *i) { (void)m;(void)c;(void)t;(void)i; }
void glGenVertexArrays(GLsizei n, GLuint *a) { if(a) for(GLsizei i=0;i<n;i++) a[i]=i+1; }
void glBindVertexArray(GLuint a) { (void)a; }
void glDeleteVertexArrays(GLsizei n, const GLuint *a) { (void)n; (void)a; }
void glTexSubImage2D(GLenum t, GLint l, GLint x, GLint y, GLsizei w, GLsizei h, GLenum f, GLenum ty, const void *d) { (void)t;(void)l;(void)x;(void)y;(void)w;(void)h;(void)f;(void)ty;(void)d; }
void glGetFloatv(GLenum p, GLfloat *v) { if(v) *v = 0.0f; (void)p; }
void glDepthFunc(GLenum f) { (void)f; }
void glDepthMask(unsigned char f) { (void)f; }
void glStencilFunc(GLenum f, GLint r, GLuint m) { (void)f;(void)r;(void)m; }
void glStencilOp(GLenum s, GLenum d, GLenum p) { (void)s;(void)d;(void)p; }
void glColorMask(unsigned char r, unsigned char g, unsigned char b, unsigned char a) { (void)r;(void)g;(void)b;(void)a; }
void glLineWidth(GLfloat w) { (void)w; }
