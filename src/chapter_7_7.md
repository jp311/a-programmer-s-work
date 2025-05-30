## 7.7 显式运行时链接

支持动态链接的系统往往都支持一种更加灵活的模块加载方式，叫做显式运行时链接（Explicit
Run-time
Linking），有时候也叫做运行时加载。也就是让程序自己在运行时控制加载指定的模块，并且可以在不需要该模块时将其卸载。从前面我们了解到的来看，如果动态链接器可以在运行时将共享模块装载进内存并且可以进行重定位等操作，那么这种运行时加载在理论上也是很容易实现的。而且一般的共享对象不需要进行任何修改就可以进行运行时装载，这种共享对象往往被叫做动态装载库（Dynamic
Loading
Library），其实本质上它跟一般的共享对象没什么区别，只是程序开发者使用它的角度不同。

这种运行时加载使得程序的模块组织变得很灵活，可以用来实现一些诸如插件、驱动等功能。当程序需要用到某个插件或者驱动的时候，才将相应的模块装载进来，而不需要从一开始就将他们全部装载进来，从而减少了程序启动时间和内存使用。并且程序可以在运行的时候重新加载某个模块，这样使得程序本身不必重新启动而实现模块的增加、删除、更新等，这对于很多需要长期运行的程序来说是很大的优势。最常见的例子是Web服务器程序，对于Web服务器程序来说，它需要根据配置来选择不同的脚本解释器、数据库连接驱动等，对于不同的脚本解释器分别做成一个独立的模块，当Web服务器需要某种脚本解释器的时候可以将其加载进来；这对于数据库连接的驱动程序也是一样的原理。另外对于一个可靠的Web服务器来说，长期的运行是必要的保证，如果我们需要增加某种脚本解释器，或者某个脚本解释器模块需要升级，则可以通知Web服务器程序重新装载该共享模块以实现相应的目的。

在Linux中，从文件本身的格式上来看，动态库实际上跟一般的共享对象没有区别，正如我们前面讨论过的。主要的区别是共享对象是由动态链接器在程序启动之前负责装载和链接的，这一系列步骤都由动态连接器自动完成，对于程序本身是透明的；而动态库的装载则是通过一系列由动态链接器提供的API，具体地讲共有4个函数：打开动态库（dlopen）、查找符号（dlsym）、错误处理（dlerror）以及关闭动态库（dlclose），程序可以通过这几个API对动态库进行操作。这几个API的实现是在/lib/libdl.so.2里面，它们的声明和相关常量被定义在系统标准头文件\<dlfcn.h\>。我们先来看看这几个函数的具体意义，然后再演示一个很有意思的小程序。

### 7.7.1 dlopen()

dlopen()
函数用来打开一个动态库，并将其加载到进程的地址空间，完成初始化过程，它的C原型定义为：

    void * dlopen(const char *filename, int flag);

第一个参数是被加载动态库的路径，如果这个路径是绝对路径（以"/"开始的路径），则该函数将会尝试直接打开该动态库；如果是相对路径，那么dlopen()会尝试在以一定的顺序去查找该动态库文件：

1.  查找有环境变量LD_LIBRARY_PATH指定的一系列目录（我们在后面会详细介绍LD_LIBRARY_PATH环境变量）。
2.  查找由/etc/ld.so.cache里面所指定的共享库路径。
3.  /lib、/usr/lib
    注意：这个查找顺序与旧的a.out装载器的顺序刚好相反，旧的a.out的装载器在装载共享库的时候会先查找/usr/lib，然后是/lib。

当然，这在理论上不应该成为一个问题，因为所有的库都应该只存在于某个目录中，而不应该在多个目录有不同的副本，这将会导致系统变得极为不可靠。

很有意思的是，如果我们将filename这个参数设置为0，那么dlopen返回的将是全局符号表的句柄，也就是说我们可以在运行时找到全局符号表里面的任何一个符号，并且可以执行它们，这有些类似高级语言反射（Reflection）的特性。全局符号表包括了程序的可执行文件本身、被动态链接器加载到进程中的所有共享模块以及在运行时通过dlopen打开并且使用了RTLD_GLOBAL方式的模块中的符号。

第二个参数flag表示函数符号的解析方式，常量RTLD_LAZY表示使用延迟绑定，当函数第一次被用到时才进行绑定，即PLT机制；而RTLD_NOW表示当模块被加载时即完成所有的函数绑定工作，如果有任何未定义的符号引用的绑定工作没法完成，那么dlopen()就返回错误。上面的两种绑定方式必须选其一。另外还有一个常量RTLD_GLOBAL可以跟上面的两者中任意一个一起使用（通过常量的"或"操作），它表示将被加载的模块的全局符号合并到进程的全局符号表中，使得以后加载的模块可以使用这些符号。在调试程序的时候我们可以使用RTLD_NOW作为加载参数，因为如果模块加载时有任何符号未被绑定的话，我们可以使用dlerror()立即捕获到相应的错误信息；而如果使用RTLD_LAZY的话，这种符号未绑定的错误会在加载后发生，则难以捕获。当然，使用RTLD_NOW会导致加载动态库的速度变慢。

dlopen的返回值是被加载的模块的句柄，这个句柄在后面使用dlsym或者dlclose时需要用到。如果加载模块失败，则返回NULL。如果模块已经通过dlopen被加载过了，那么返回的是同一个句柄。另外如果被加载的模块之间有依赖关系，比如模块A依赖与模块B，那么程序员需要手工加载被依赖的模块，比如先加载B，再加载A。

事实上dlopen还会在加载模块时执行模块中初始化部分的代码，我们前面提到过，动态链接器在加载模块时，会执行".init"段的代码，用以完成模块的初始化工作，dlopen的加载过程基本跟动态链接器一致，在完成装载、映射和重定位以后，就会执行".init"段的代码然后返回。

### 7.7.2 dlsym()

dlsym函数基本上是运行时装载的核心部分，我们可以通过这个函数找到所需要的符号。它的定义如下：

    void * dlsym(void *handle, char *symbol);

定义非常简洁，两个参数，第一个参数是由dlopen()返回的动态库的句柄；第二个参数即所要查找的符号的名字，一个以"\\0"结尾的C字符串。如果dlsym()找到了相应的符号，则返回该符号的值；没有找到相应的符号，则返回NULL。dlsym()返回的值对于不同类型的符号，意义是不同的。如果查找的符号是个函数，那么它返回函数的地址；如果是个变量，它返回变量的地址；如果这个符号是个常量，那么它返回的是该常量的值。这里有一个问题是：如果常量的值刚好是NULL或者0呢，我们如何判断dlsym()是否找到了该符号呢？这就要用到我们下面介绍的dlerror()函数了。如果符号找到了，那么dlerror()返回NULL，如果没找到，dlerror()就会返回相应的错误信息。

> **注意**
>
> 符号不仅仅是函数和变量，有时还是常量，比如表示编译单元文件名的符号等，这一般由编译器和链接器产生，而且对外不可见，但它们的确存在于模块的符号表中。dlsym()是可以查找到这些符号的，我们也可以通过"objdump
> --t"来查看符号表，常量在符号表里面的类型是"\*ABS\*"。

#### 符号优先级

前面在介绍动态链接实现时，我们已经碰到过许多共享模块中符号名冲突的问题，结论是当多个同名符号冲突时，先装入的符号优先，我们把这种优先级方式称为装载序列（Load
Ordering）。那么当我们的进程中有模块是通过dlopen()装入的共享对象时，这些后装入的模块中的符号可能会跟先前已经装入了的模块之间的符号重复。那么这时候模块之间的符号冲突该怎么解决呢？实际上不管是之前由动态链接器装入的还是之后由dlopen装入的共享对象，动态链接器在进行符号的解析以及重定位时，都是采用装载序列。

那么当我们使用dlsym()进行符号的地址查找工作时，这个函数是不是也是按照装载序列的优先级进行符号的查找呢？实际的情况是，dlsym()对符号的查找优先级分两种类型。第一种情况是，如果我们是在全局符号表中进行符号查找，即dlopen()时，参数filename为NULL，那么由于全局符号表使用的装载序列，所以dlsym()使用的也是装载序列。第二种情况是如果我们是对某个通过dlopen()打开的共享对象进行符号查找的话，那么采用的是一种叫做依赖序列（Dependency
Ordering）的优先级。什么叫依赖序列呢？它是以被dlopen()打开的那个共享对象为根节点，对它所有依赖的共享对象进行广度优先遍历，直到找到符号为止。

### 7.7.3 dlerror()

每次我们调用dlopen()、dlsym()或dlclose()以后，我们都可以调用dlerror()函数来判断上一次调用是否成功。dlerror()的返回值类型是char\*，如果返回NULL，则表示上一次调用成功；如果不是，则返回相应的错误消息。

7.7.4 dlclose()

dlclose()的作用跟dlopen()刚好相反，它的作用是将一个已经加载的模块卸载。系统会维持一个加载引用计数器，每次使用dlopen()加载某模块时，相应的计数器加一；每次使用dlclose()卸载某模块时，相应计数器减一。只有当计数器值减到0时，模块才被真正地卸载掉。卸载的过程跟加载刚好相反，先执行".finit"段的代码，然后将相应的符号从符号表中去除，取消进程空间跟模块的映射关系，然后关闭模块文件。

下面是一个简单的例子，这段程序将数学库模块用运行时加载的方法加载到进程中，然后获取sin()函数符号地址，调用sin()并且返回结果：

    #include <stdio.h>
    #include <dlfcn.h>

    int main(int argc, char* argv[])
    {
        void* handle;
        double (*func)(double);
        char* error;

        handle = dlopen(argv[1],RTLD_NOW);
        if(handle == NULL) {
            printf("Open library %s error: %s\n", argv[1], dlerror());
            return -1;
        }

        func = dlsym(handle,"sin");
        if( (error = dlerror()) != NULL ) {
            printf("Symbol sin not found: %s\n", error);
            goto exit_runso;
        }

        printf( "%f\n", func(3.1415926 / 2) );

        exit_runso:
        dlclose(handle);
    }

    $gcc –o RunSoSimple RunSoSimple.c –ldl
    $./RunSoSimple /lib/libm-2.6.1.so
    1.000000

> -ldl 表示使用DL库（Dynamical Loading），它位于/lib/libdl.so.2。

### 7.7.5 运行时装载的演示程序

或许我们都听说过Windows下有个程序叫做rundll，这个程序可以把Windows的DLL当作程序来运行。我们知道DLL是Windows的动态链接库，原理上跟Linux下的共享对象是一种类型的文件（我们将在后面的章节中详细介绍Windows
DLL）。rundll其实就是利用了运行时加载的原理，将指定的共享对象在运行时加载进来，然后找到某个函数（DLL中是DllMain）开始执行。我们这个例子中将实现一个更为灵活的叫做runso的程序，这个程序可以通过命令行来执行共享对象里面的任意一个函数。它在理论上很简单，基本的步骤就是：由命令行给出共享对象路径、函数名和相关参数，然后程序通过运行时加载将该模块加载到进程中，查找相应的函数，并且执行它，然后将执行结果打印出来。但是这里有一个很大的问题是：不同的函数有不同的参数和返回值类型，即有不同的函数签名。当我们需要运行某个指定的函数时，仅仅知道它的地址是不够的，还必须知道它的函数签名。这些信息是无法通过运行时加载获得的（很多高级语言（平台）如Java、.NET里面的反射功能可以实现运行时获得函数的额外信息，包括参数、返回值类型等），因为C/C++编译器在编译时并没有把这些信息也保存到目标文件、可执行文件或者共享对象等，我们仅仅能获得的是函数的地址。从这一点来看，C/C++的确不能被称为"高级"语言。

对于上面无法得知函数类型的问题，我们只能通过调用者指定函数的参数和返回值类型来实现。比如我们规定RunSo的使用方式如下：

    $RunSo /lib/foobar.so function arg1 arg2 ... return_type

为了表示参数和返回值类型，我们假设字母d表示double、i表示int、s表示char\*、v表示void。然后我们在参数之前加一个字母表示参数的类型：

    $./RunSo /lib/libm-2.6.1.so sin d2.0 d

这就表示我们希望调用/lib/libm-2.6.1.so里面的sin函数，其中第一个参数是double类型的，参数值是2.0；最后一个字母d表示sin函数的返回值是double类型的。那么如果要调用/lib/libfoo.so里面一个void
bar(char\* str, int i)的函数可以使用如下命令行：

    $./RunSo /lib/libfoo.so bar sHello i10 v

上面的命令相当于调用bar("Hello",
10)。函数的类型我们已经通过手工指定可以得知了，但在RunSo的实现上还有一个问题存在。

我们上面的例子中，sin函数的类型是程序员手工指定的，也就是我们知道数学库里面有这样一个sin函数，它的类型是double
sin(double)，于是我们定义了一个指向这种类型的函数指针double
(\*func)(double)。但是如果要做到调用任意一个函数，我们不可能为每种函数都定义相同类型的函数指针，然后去调用它，因为函数参数的组合有无数种。为了解决这个问题，我们必须了解函数调用的约定（具体参照后面的函数调用约定），然后在调用函数之前伪造好相应的堆栈，造成正常函数调用的假象。为了能够直接操作堆栈，我们不得不使用嵌入汇编代码来完成相应的操作。下面这个例子就是RunSo的源代码，其中用到了一些嵌入汇编代码和一些函数调用约定的知识，稍微有点复杂，如果你一时没有看明白可以等看完"函数调用约定"再回来仔细研究这段代码，就会豁然开朗了。如果对嵌入汇编代码不是很熟悉，可以再回顾一下最开始我们介绍过的嵌入汇编代码的内容，如下：

    #include <stdio.h>
    #include <dlfcn.h>

    #define SETUP_STACK           \
    i = 2;                          \
    while(++i < argc - 1) {         \
        switch(argv[i][0]) {        \
        case 'i':                   \
            asm volatile("push %0" :: \
     "r"(atoi(&argv[i][1])) );  \
            esp += 4;             \
            break;                  \
        case 'd':                 \
            atof(&argv[i][1]);        \
            asm volatile("subl $8,%esp\n" \
            "fstpl (%esp)" );         \
            esp += 8;             \
            break;                  \
        case 's':                 \
            asm volatile("push %0" ::   \
            "r"(&argv[i][1]) );         \
            esp += 4;             \
            break;                  \
        default:                  \
            printf("error argument type");  \
            goto exit_runso;          \
        }                     \
    }

    #define RESTORE_STACK             \
        asm volatile("add %0,%%esp"::"r"(esp))
    int main(int argc, char* argv[])
    {
        void* handle;
        char* error;
        int i;
        int esp = 0;    
        void* func;

        handle = dlopen(argv[1], RTLD_NOW);
        if(handle == 0) {
            printf("Can't find library: %s\n", argv[1]);
            return -1;
        }

        func = dlsym(handle, argv[2]);
        if( (error = dlerror()) != NULL ) {
            printf("Find symbol %s error: %s\n", argv[2], error);
            goto exit_runso;
        }

        switch(argv[argc-1][0]){
        case 'i':
        {
            int (*func_int)() = func;
            SETUP_STACK;
            int ret = func_int();
            RESTORE_STACK;
            printf("ret = %d\n", ret );
            break;
        }
        case 'd':
        {
            double (*func_double)() = func;
     SETUP_STACK;
            double ret = func_double();
            RESTORE_STACK;
            printf("ret = %f\n", ret );
            break;
        }
        case 's':
        {
            char* (*func_str)() = func;
            SETUP_STACK;
            char* ret = func_str();
            RESTORE_STACK;
            printf("ret = %s\n", ret );
            break;
        }
        case 'v':
        {    
            void (*func_void)() = func;
            SETUP_STACK
            func_void();
            RESTORE_STACK;
            printf("ret = void");
            break;
        }
        } // end of switch

        exit_runso:

        dlclose(handle);
    }
