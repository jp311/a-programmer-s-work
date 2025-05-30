## 13.3 C++运行库实现

现在Mini
CRT已经能够支持最基本的C语言程序运行了。C++作为兼容C语言的扩展语言，它的运行库的实现其实并不复杂，在这一章中将介绍如何为Mini
CRT添加对C++语言的一些常用的操作支持。

通常C++的运行库都是独立于C语言运行库的，比如Linux下C语言运行库为libc.so/libc.a，而C++运行库为（libstdc++.so/libstdc++.a）；Windows的C语言运行库为libcmt.lib/msvcr90.dll，而C++运行库为libcpmt.lib/msvcp90.dll。一般这些C++的运行库都是依赖于C运行库的，它们仅包含对C++的一些特性的支持，比如new/delete、STL、异常处理、流（stream）等。但是它们并不包含诸如入口函数、堆管理、基本文件操作等这些特性，而这些也是C++运行库所必需的，比如C++的流和文件操作依赖于C运行库的基本文件操作，所以它必须依赖于C运行库。

本节中我们将在Mini
CRT的基础上实现一个支持C++的运行库，当然出于简单起见，将这个C++运行库的实现与Mini
CRT合并到一起，而不是单独成为一个库文件，也就是说经过这一节对Mini
CRT的功能改进，最终编译出来的minicrt.a/minicrt.lib将支持C++的诸多特性。

当然，要完整实现一个C++的运行库是很费事的一件事，C++标准模板库STL包含了诸如流、容器、算法、字符串等，规模较为庞大。出于演示的目的，我们将对C++的标准库进行简化，最终目标是实现一个能够成功运行如下C++程序代码的运行库：

    // test.cpp
    #include <iostream>
    #include <string>

    using namespace std;

    int main(int argc, char* argv[])
    {
        string* msg = new string(“Hello World”);
        cout << *msg << endl;
        delete msg;
        return 0;
    }

上面这段程序看似简单，实际上它用到了C++运行库的诸多功能，我们将所用到的特性列举如下：

- string类的实现。
- stream类的实现，包括操纵符（Manupilator）（endl）。
- 全局对象构造和析构（cout）。
- new/delete。

在开始本节之前，还是按照前面Mini
CRT实现时的做法：在进入具体主题之前先列举一些实现的原则。在实现Mini
CRT对C++的支持时，我们遵循如下原则：

- HelloWorld程序无须用到的功能就不实现，比如异常。
- 尽量简化设计，尽量符合C++标准库的规范。
- 对于可以直接在头文件实现的模块尽量在头文件中实现，以免诸多的类、函数的声明和定义造成代码量膨胀，不便于演示。
- 与前面的Mini
  CRT实现一样，运行库代码要做到可以在Windows和Linux上同时运行，因此对于平台相关部分要使用条件编译分别实现。虽然C++运行库几乎没有与系统相关的部分（全局构造和析构除外），C运行库已经将大部分系统相关部分封装成C标准库接口，C++运行库只须要调用这些接口即可。
- 另外值得一提的是，模板是不需要运行库支持的，它的实现依赖于编译器和链接器，对运行库基本上没有要求。

### 13.3.1 new与delete

首先从比较简单的模块入手，全局new/delete操作的实现应该是最简单的部分。我们知道，new操作的功能是从堆上分配一块对象大小的空间，然后运行对象的初始化函数将这个空间地址返回；而delete则是与new相反的操作，它首先运行对象的析构函数，然后释放堆空间。

那么new和delete究竟在C++中是一个什么样的地位呢？它们是编译器内置的操作吗？它们跟运行库有什么关系呢？为了解释这些问题，首先来看一小段代码：

    class C {
    };

    int main()
    {
        C* c = new C();
        return 0;
    }

假如用GCC编译这段代码并且反汇编，将会看到new操作的实现：

    $g++ -c hello.c
    $objdump -dr hello.o

    hello.o:     file format elf32-i386

    Disassembly of section .text:

    00000000 <main>:
       0:   8d 4c 24 04             lea    0x4(%esp),%ecx
       4:   83 e4 f0                and    $0xfffffff0,%esp
       7:   ff 71 fc                pushl  -0x4(%ecx)
       a:   55                        push   %ebp
       b:   89 e5                   mov    %esp,%ebp
       d:   51                      push   %ecx
       e:   83 ec 14                sub    $0x14,%esp
      11:   c7 04 24 01 00 00 00  movl   $0x1,(%esp)
      18:   e8 fc ff ff ff          call   19 <main+0x19>
                            19: R_386_PC32  _Znwj
      1d:   89 45 f8              mov    %eax,-0x8(%ebp)
      20:   b8 00 00 00 00        mov    $0x0,%eax
      25:   83 c4 14                add    $0x14,%esp
      28:   59                      pop    %ecx
      29:   5d                      pop    %ebp
      2a:   8d 61 fc                lea    -0x4(%ecx),%esp
      2d:   c3                      ret

可以看到，new操作的实现实际上是调用了一个叫做_Znwj的函数，如果用c++filt将这个符号反修饰（Demangle），可以看到它的真面目：

    $c++filt _Znwj
    operator new(unsigned int)

可以看到_Znwj实际上是一个叫做operator
new的函数，这也是我们在C++中熟悉的操作符函数。在C++中，操作符实际上是一种特殊的函数，叫做操作符函数，一般new操作符函数被定义为：

    void* operator new(unsigned int size);

除了new、delete这样的操作符以外，+、-、\*、%等都可以被认为是操作符，这些操作符都有相对应的操作符函数。对于operator
new函数来说，它的参数size是指须要申请的空间大小，一般是指new对象的大小，而返回值是申请的堆地址。delete操作符函数的参数是对象的地址，它没有返回值。

既然new/delete的实现是相应的操作符函数，那么，如果要实现new/delete，就只须要实现这两个函数就可以了。而这两个函数的主要功能是申请和释放堆空间，这再容易不过了，因为在Mini
CRT中已经实现了堆空间的申请和释放函数：malloc和free。于是new/delete的实现变得尤为简单，它们的实现源代码如清单13-8所示。

清单13-8 new_delete.cpp

    //new_delete.cpp
    extern "C" void* malloc(unsigned int);
    extern "C" void free(void*);

    void* operator new(unsigned int size)
    {
        return malloc(size);
    }

    void operator delete(void* p)
    {
        free(p);
    }

    void* operator new[](unsigned int size)
    {
        return malloc(size);
    }

    void operator delete[](void* p)
    {
        free(p);
    }

在上面代码中除了new/delete之外，我们还看到了new\[\]和delete\[\]，它们分别是用来申请和释放对象数组的，在这里一并予以实现。另外除了申请和释放堆空间之外，没有看到任何对象构造和析构的调用，其实对象的构造和析构是在new/delete之前/之后由编译器负责产生相应的代码进行调用的，new/delete仅仅负责堆空间的申请和释放，不负责构造和析构。

在真实的C++运行库中，new/delete的实现要比上面的复杂一些，它们除了使用malloc/free申请释放空间之外，还支持new_handler在申请失败时给予程序进行补救的机会、还可能会抛出bad_alloc异常等，由于Mini
CRT并不支持异常，所以就省略了这些内容。

另外值得一提的是，在使用真实的C++运行库时，也可以使用上面这段代码自己实现new/delete，这样就会将原先C++运行库的new/delete覆盖，使得有机会在new/delete时记录对象的空间分配和释放，可以实现一些特殊的功能，比如检查程序是否有内存泄露。这种做法往往被称为全局new/delete操作符重载（Global
new/delete operator
overloading）。除了重载全局new/delete操作符之外，也可以重载某个类的new/delete，这样可以实现一些特殊的需求，比如指定对象申请地址（Replacement
new），或者使用自己实现的堆算法对某个对象的申请/释放进行优化，从而提高程序的性能等，这方面的讨论在C++领域已经非常深入了，在此我们不一一展开了。

### 13.3.2 C++全局构造与析构

C++全局构造与析构的实现是有些特殊的，它与编译器、链接器的关系比较紧密。正如已经在第10章中所描述的一样，它们的实现是依赖于编译器、链接器和运行库三者共同的支持和协作的。Mini
CRT对于全局对象构造与析构的实现也是基于第10章中描述的Glibc和MSVC
CRT的，本质上没有多大的区别，仅仅是将它们简化到最简程度，保留本质而去除了一些繁琐的细节。

通过第10章的分析我们可以得知，C++全局构造和析构的实现在Glibc和MSVC
CRT中的原理十分相似，构造函数主要实现的是依靠特殊的段合并后形成构造函数数组，而析构则依赖于atexit()函数。这一节中将主要关注全局构造的实现，而把atexit()的实现留到下一节中。

全局构造对于MSVC来说，主要实现两个段".CRT\$XCA"和".CRT\$XCZ"，然后定义两个函数指针分别指向它们；而对于GCC来说，须要定义".ctor"段的起始部分和结束部分，然后定义两个函数指针分别指向它们。真正的构造部分则只要由一个循环将这两个函数指针指向的所有函数都调用一遍即可。

MSVC CRT与Glibc在实现上稍有不同的是，MSVC
CRT只需要一个目标文件就可以实现全局构造，编译器会按照段名将所有的输入段排序；而Glibc需要两个文件：ctrbegin.o和crtend.o，这两个文件在编译时必须位于输入文件的开始和结尾部分，所有在这两个文件之外的输入文件中的".ctor"段就不会被正确地合并。全局构造和析构的实现代码如清单13-9所示。

清单13-9 ctors.cpp

    // ctors.cpp
    typedef void (*init_func)(void);
    #ifdef WIN32
    #pragma section(".CRT$XCA",long,read)
    #pragma section(".CRT$XCZ",long,read)

    __declspec(allocate(".CRT$XCA")) init_func ctors_begin[] = { 0 };
    __declspec(allocate(".CRT$XCZ")) init_func ctors_end[] = { 0 };

    extern "C" void do_global_ctors()
    {
      init_func* p = ctors_begin;
      while ( p < ctors_end )
        {
            if (*p != 0)
                (**p)();
            ++p;
        }
    }
    #else

    void run_hooks();
    extern "C" void do_global_ctors()
    {
        run_hooks();
    }
    #endif

在.ctors.cpp中包含了Windows的全局构造的所有实现代码，但Linux的全局构造还需要crtbegin和crtend两个部分。这两个文件内容如清单13-10、清单13-11所示。

清单13-10 crtbegin.cpp

    ///crtbegin.cpp
    #ifndef WIN32
    typedef void (*ctor_func)(void);

    ctor_func ctors_begin[1] __attribute__ ((section(".ctors"))) =
    {
        (ctor_func) -1
    };

    void run_hooks()
    {
        const ctor_func* list = ctors_begin;
        while ((int)*++list != -1)
            (**list)();
    }
    #endif 

清单13-11 crtend.cpp

    //crtend.cpp
    #ifndef WIN32
    typedef void (*ctor_func)(void);
    ctor_func crt_end[1] __attribute__ ((section(".ctors"))) = 
    {
        (ctor_func) -1
    };
    #endif

### 13.3.3 atexit实现

atexit()的用法十分简单，即由它注册的函数会在进程退出前，在exit()函数中被调用。atexit()和exit()函数实际上并不属于C++运行库的一部分，它们是C语言运行库的一部分。在前面实现Mini
CRT时我们在exit()函数的实现中预留了对atexit()的支持。

本来可以不实现atexit()的，毕竟它不是非常重要的CRT函数，但是在这里不得不实现atexit的原因是：所有全局对象的析构函数------不管是Linux还是Windows------都是通过atexit或其类似函数来注册的，以达到在程序退出时执行的目的。

实现它的基本思路也很简单，就是使用一个链表把所有注册的函数存储起来，到exit()时将链表遍历一遍，执行其中所有的回调函数，Windows版的atexit的确可以按照这个思路实现。

Linux版的atexit要复杂一些，导致这个的问题的原因是GCC实现全局对象的析构不是调用的atexit，而是调用的\_\_cxa_atexit。这个函数在前面的全局构造和析构中也碰到过，它不是C语言标准库函数，它是GCC实现的一部分。为了兼容GCC，Mini
CRT不得不实现它。它的定义与atexit()有所不同的是，\_\_cxa_atexit所接受的参数类型和atexit不同：

    typedef void (*cxa_func_t )( void* );
    typedef void (*atexit_func_t )( void );
    int __cxa_atexit(cxa_func_t func, void* arg, void*);
    int atexit(atexit_func_t func);

\_\_cxa_atexit所接受的函数指针必须有一个void\*型指针作为参数，并且调用\_\_cxa_atexit的时候，这个参数(void\*
arg)也要随着记录下来，等到要执行的时候再传递进去。也就是说，\_\_cxa_atexit()注册的回调函数是带一个参数的，我们必须把这个参数也记下来。

> \_\_cxa_atexit的最后一个参数可以忽略，在这里不会用到。

于是在设计链表时要考虑到这一点，链表的节点必须能够区分是否是atexit()函数\_\_cxa_atexit()注册的函数，如果是\_\_cxa_atexit()注册的函数，还要把回调函数的参数保存下来。我们定义链表节点的结构如下：

    typedef struct _func_node
    {
        atexit_func_t func;
        void* arg;
        int is_cxa;
        struct _func_node* next;
    } func_node;

其中is_cxa成员如果不为0，则表示这个节点是由\_\_cxa_atexit()注册的回调函数，arg成员表示相应的参数。atexit的实现代码如清单13-12所示。

清单13-12 atexit.c

    // atexit.c
    #include "minicrt.h"

    typedef struct _func_node
    {
        atexit_func_t func;
        void* arg;
        int is_cxa;
        struct _func_node* next;
    } func_node;

    static func_node* atexit_list = 0;

    int register_atexit(atexit_func_t func, void* arg, int is_cxa)
    {
        func_node* node;
        if (!func) return -1;

        node = (func_node*)malloc(sizeof(func_node));
        
        if(node == 0) return -1;

        node->func = func;
        node->arg = arg;
        node->is_cxa = is_cxa;
        node->next = atexit_list;
        atexit_list = node;
        return 0;
    }

    #ifndef WIN32
    typedef void (*cxa_func_t )( void* );
    int __cxa_atexit(cxa_func_t func, void* arg, void* unused)
    {
        return register_atexit((atexit_func_t)func, arg, 1);
    }
    #endif

    int atexit(atexit_func_t func)
    {
        return register_atexit(func, 0, 0);
    }

    void mini_crt_call_exit_routine()
    {
        func_node* p = atexit_list;
        for(; p != 0; p = p->next)
        {
            #ifdef WIN32
                p->func();
            #else
            if (p->is_cxa)
                ((cxa_func_t)p->func)(p->arg);
            else
                p->func();
            #endif
            free(p);
        }
        atexit_list = 0;
    }

值得一提的是，在注册函数时，被注册的函数是插入到列表头部的，而最后mini_crt_call_exit_routine()是从头部开始遍历的，于是由atexit()或\_\_cxa_atexit()注册的函数是按照先注册后调用的顺序，这符合析构函数的规则，因为先构造的全局对象应该后析构。

### 13.3.4 入口函数修改

由于增加了全局构造和析构的支持，那么需要对Mini
CRT的入口函数和exit()函数进行修改，把对do_global_ctors()和mini_crt_call_exit_routine()的调用加入到entry()和exit()函数中去。修改后的entry.c如下（省略一部分未修改的内容）：

    //entry.c
    …
    void mini_crt_entry(void)
    {
    …
        if (!mini_crt_heap_init())
            crt_fatal_error("heap initialize failed");

        if (!mini_crt_io_init())
            crt_fatal_error("IO initialize failed");
        
        do_global_ctors();

        ret = main(argc,argv);
        exit(ret);
    }

    void exit(int exitCode)
    {
        mini_crt_call_exit_routine();
    #ifdef WIN32
        ExitProcess(exitCode);
    #else
        asm( "movl %0,%%ebx \n\t"
             "movl $1,%%eax \n\t"
             "int $0x80     \n\t" 
             "hlt           \n\t"::"m"(exitCode));
    #endif
    }

### 13.3.5 stream与string

C++的Hello
World里面一般都会用到cout和string，以展示C++的特性。流和字符串是C++
STL的最基本的两个部分，我们在这一节中为Mini
CRT增加string和stream的实现，在有了流和字符串之后，Mini
CRT将最终宣告完成，可以考虑将它重命名为Mini CRT++ ?。

当然，在真正的STL实现中，string和stream的实现十分复杂，不仅有强大的模板定制功能、缓冲，庞大的继承体系及一系列辅助类。我们在实现时还是以展示和剖析为最基本的目的，简化一切能够简化的内容。string和stream的实现将遵循下列原则。

- 不支持模板定制，即这两个类仅支持char字符串类型，不支持自定义分配器等，没有basic_string模板类。
- 流对象仅实现ofstream，且没有继承体系，即没有ios_base、stream、ostream、fstream等类似的相关类。
- 流对象没有内置的缓冲功能，即没有stream_buffer类支持。
- cout作为ofstream的一个实例，它的输出文件是标准输出。

stream和string类的实现用到了不少C++语言的特性，已经一定程度上偏离了本书所要描述的主题，因此在此仅将它们的实现源代码列出，而不做更多的详细分析。有兴趣的读者可以参考C++
STL的相关实现的资料，如果对C++语言本身不熟悉，也可以跳过这一节，这并不影响对Mini
CRT整体实现的理解。string和iostream的实现如清单13-13、清单13-14、清单13-15所示。

清单13-13 string

    // string

    namespace std {

        class string
        {
            unsigned len;
            char* pbuf;
            
        public:
            explicit string(const char* str);
            string(const string&);
            ~string();
            string& operator=(const string&);
            string& operator=(const char* s);
            const char& operator[](unsigned idx) const;
            char& operator[](unsigned idx);
            const char* c_str() const;
            unsigned length() const;
            unsigned size() const;
        };

        string::string(const char* str) :
            len (0), pbuf(0)
        {
            *this = str;
        }

        string::string(const string& s) : 
            len(0), pbuf(0)
        {
            *this = s;
        }
        string::~string()
        {
            if(pbuf != 0) {
                delete[] pbuf;
                pbuf = 0;
            }
        }

        string& string::operator=(const string& s)
        {
            if (&s == this)
                return *this;
            this->~string();
            len = s.len;
            pbuf = strcpy(new char[len + 1], s.pbuf);
            return *this;
        }


        string& string::operator=(const char* s)
        {
            this->~string();
            len = strlen(s);
            pbuf = strcpy(new char[len + 1], s);
            return *this;
        }

        const char& string::operator[](unsigned idx) const
        {
            return pbuf[idx];
        }
        char& string::operator[](unsigned idx)
        {
            return pbuf[idx];
        }
        const char* string::c_str() const
        {
            return pbuf;
        }
        unsigned string::length() const
        {
            return len;
        }
        unsigned string::size() const
        {
            return len;
        }
        ofstream& operator<<(ofstream& o, const string& s)
        {
            return o << s.c_str();
        }
    }

清单13-14 iostream

    // iostream
    #include "minicrt.h"

    namespace std {

    class ofstream
    {
        protected:
            FILE* fp;
            ofstream(const ofstream&);
        public:
            enum openmode{in = 1, out = 2, binary = 4, trunc = 8};

            ofstream();
            explicit ofstream(const char *filename, ofstream::openmode md = ofstream::out);
            ~ofstream();
            ofstream& operator<<(char c);
            ofstream& operator<<(int n);
            ofstream& operator<<(const char* str);
            ofstream& operator<<(ofstream& (*)(ofstream&));
            void open(const char *filename, ofstream::openmode md = ofstream::out); 
            void close();
            ofstream& write(const char *buf, unsigned size);
    };

    inline ofstream& endl(ofstream& o)
    {
        return o << '\n';
    }

    class stdout_stream : public ofstream {
    public:
        stdout_stream();
    };

    extern stdout_stream cout;
    }

清单13-15 iostream.cpp

    // iostream.cpp
    #include "minicrt.h"
    #include "iostream"

    #ifdef WIN32
    #include <Windows.h>
    #endif

    namespace std {

    stdout_stream::stdout_stream() : ofstream() 
    {
            fp = stdout;
    }

    stdout_stream cout;

    ofstream::ofstream() : fp(0)
    {
    }

    ofstream::ofstream(const char *filename, ofstream::openmode md) : fp(0)
    {
        open(filename, md);
        
    }
    ofstream::~ofstream()
    {
        close();
    }
    ofstream& ofstream::operator<<(char c)
    {
        fputc(c, fp);
        return *this;
    }
    ofstream& ofstream::operator<<(int n)
    {
        fprintf(fp, "%d", n);
        return *this;
    }
    ofstream& ofstream::operator<<(const char* str)
    {
        fprintf(fp, "%s", str);
        return *this;
    }

    ofstream& ofstream::operator<<(ofstream& (*manip)(ofstream&))
    {
        return manip(*this);
    }

    void ofstream::open(const char *filename, ofstream::openmode md)
    {
        char mode[4];
        close();
        switch (md)
        {
        case out | trunc:
            strcpy(mode, "w");
            break;
        case out | in | trunc:
            strcpy(mode, "w+");
        case out | trunc | binary:
            strcpy(mode, "wb");
            break;
        case out | in | trunc | binary:
            strcpy(mode, "wb+");
        }
        fp = fopen(filename, mode);
    }
    void ofstream::close()
    {
        if (fp)
        {
            fclose(fp);
            fp = 0;
        }
    }

    ofstream& ofstream::write(const char *buf, unsigned size)
    {
        fwrite(buf, 1, size, fp);
        return *this;
    }

    }
