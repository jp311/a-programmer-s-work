## 12.2 系统调用原理

### 12.2.1 特权级与中断

现代的CPU常常可以在多种截然不同的特权级别下执行指令，在现代操作系统中，通常也据此有两种特权级别，分别为用户模式（User
Mode）和内核模式（Kernel
Mode），也被称为用户态和内核态。由于有多种特权模式的存在，操作系统就可以让不同的代码运行在不同的模式上，以限制它们的权力，提高稳定性和安全性。普通应用程序运行在用户态的模式下，诸多操作将受到限制，这些操作包括访问硬件设备、开关中断、改变特权模式等。

一般来说，运行在高特权级的代码将自己降至低特权级是允许的，但反过来低特权级的代码将自己提升至高特权级则不是轻易就能进行的，否则特权级的作用就有名无实了。在将低特权级的环境转为高特权级时，须要使用一种较为受控和安全的形式，以防止低特权模式的代码破坏高特权模式代码的执行。

系统调用是运行在内核态的，而应用程序基本都是运行在用户态的。用户态的程序如何运行内核态的代码呢？操作系统一般是通过中断（Interrupt）来从用户态切换到内核态。什么是中断呢？中断是一个硬件或软件发出的请求，要求CPU暂停当前的工作转手去处理更加重要的事情。举一个例子，当你在编辑文本文件的时候，键盘上的键不断地被按下，CPU如何获知这一点的呢？一种方法称为轮询（Poll），即CPU每隔一小段时间（几十到几百毫秒）去询问键盘是否有键被按下，但除非用户是疯狂打字员，否则大部分的轮询行为得到的都是"没有键被按下"的回应，这样操作就被浪费掉了。另外一种方法是CPU不去理睬键盘，而当键盘上有键被按下时，键盘上的芯片发送一个信号给CPU，CPU接收到信号之后就知道键盘被按下了，然后再去询问键盘被按下的键是哪一个。
这样的信号就是一种中断，结果如图12-1所示。

![](../Images/12-1.jpg)\
图12-1 现实中的中断

中断一般具有两个属性，一个称为中断号（从0开始），一个称为中断处理程序（Interrupt
Service Routine,
ISR）。不同的中断具有不同的中断号，而同时一个中断处理程序一一对应一个中断号。在内核中，有一个数组称为中断向量表（Interrupt
Vector
Table），这个数组的第n项包含了指向第n号中断的中断处理程序的指针。当中断到来时，CPU会暂停当前执行的代码，根据中断的中断号，在中断向量表中找到对应的中断处理程序，并调用它。中断处理程序执行完成之后，CPU会继续执行之前的代码。一个简单的示意图如图12-2所示。

![](../Images/12-2.jpg)\
图12-2 CPU中断过程

通常意义上，中断有两种类型，一种称为硬件中断，这种中断来自于硬件的异常或其他事件的发生，如电源掉电、键盘被按下等。另一种称为软件中断，软件中断通常是一条指令（i386下是int），带有一个参数记录中断号，使用这条指令用户可以手动触发某个中断并执行其中断处理程序。例如在i386下，int
0x80这条指令会调用第0x80号中断的处理程序。

由于中断号是很有限的，操作系统不会舍得用一个中断号来对应一个系统调用，而更倾向于用一个或少数几个中断号来对应所有的系统调用。例如，i386下Windows里绝大多数系统调用都是由int
0x2e来触发的，而Linux则使用int
0x80来触发所有的系统调用。对于同一个中断号，操作系统如何知道是哪一个系统调用要被调用呢？和中断一样，系统调用都有一个系统调用号，就像身份标识一样来表明是哪一个系统调用，这个系统调用号通常就是系统调用在系统调用表中的位置，例如Linux里fork的系统调用号是2。这个系统调用号在执行int指令前会被放置在某个固定的寄存器里，对应的中断代码会取得这个系统调用号，并且调用正确的函数。以Linux的int
0x80为例，系统调用号是由eax来传入的。用户将系统调用号放入eax，然后使用int
0x80调用中断，中断服务程序就可以从eax里取得系统调用号，进而调用对应的函数。

### 12.2.2 基于int的Linux的经典系统调用实现

在本节里，我们将了解到当应用程序调用系统调用时，程序是如何一步步进入操作系统内核调用相应函数的。图12-3是以fork为例的Linux系统调用的执行流程。

![](../Images/12-3.jpg)\
图12-3 Linux系统中断流程

接下来让我们一步一步地了解这个过程的细节。

#### 1. 触发中断

首先当程序在代码里调用一个系统调用时，是以一个函数的形式调用的，例如程序调用fork：

    int main()
    {
        fork();
    }

fork函数是一个对系统调用fork的封装，可以用下列宏来定义它：

    _syscall0(pid_t, fork);

\_syscall0是一个宏函数，用于定义一个没有参数的系统调用的封装。它的第一个参数为这个系统调用的返回值类型，这里为pid_t，是一个Linux自定义类型，代表进程的id。\_syscall0的第二个参数是系统调用的名称，\_syscall0展开之后会形成一个与系统调用名称同名的函数。下面的代码是i386版本的syscall0定义：

    #define _syscall0(type,name)          \
    type name(void)                       \
    {                                     \
    long __res;                           \
    __asm__ volatile ("int $0x80"         \
        : "=a" (__res)                    \
        : "0" (__NR_##name));             \
    __syscall_return(type,__res);         \
    }

对于syscall0(pid_t, fork)，上面的宏将展开为：

    pid_t fork(void) 
    { 
        long __res; 
        __asm__ volatile ("int $0x80" 
            : "=a" (__res) 
            : "0" (__NR_fork)); 
        __syscall_return(pid_t,__res);
    }

如果读者对这种AT&T格式的汇编不熟悉，请看下面的解释。

- 首先\_\_asm\_\_是一个gcc的关键字，表示接下来要嵌入汇编代码。volatile关键字告诉GCC对这段代码不进行任何优化。
- \_\_asm\_\_的第一个参数是一个字符串，代表汇编代码的文本。这里的汇编代码只有一句：int
  \$0x80，这就要调用0x80号中断。
- \"=a\" (\_\_res)表示用eax（a表示eax）输出返回数据并存储在\_\_res里。
- \"0\"
  (\_\_NR\_##name))表示\_\_NR\_##name为输入，"0"指示由编译器选择和输出相同的寄存器（即eax）来传递参数。

更直观一点，可以把这段汇编改写为更为可读的格式：

    main -> fork:

    pid_t fork(void) 
    { 
        long __res;
        $eax = __NR_fork
        int $0x80 
        __res = $eax
        __syscall_return(pid_t,__res);
    }

\_\_NR_fork是一个宏，表示fork系统调用的调用号，对于x86体系结构，该宏的定义可以在Linux/include/asm-x86/unistd_32.h里找到：

    #define __NR_restart_syscall    0
    #define __NR_exit                 1
    #define __NR_fork                 2
    #define __NR_read                 3
    #define __NR_write                4
    ......

而\_\_syscall_return是另一个宏，定义如下：

    #define __syscall_return(type, res)                     \
    do {                                                    \
        if ((unsigned long)(res) >= (unsigned long)(-125)) {  \
            errno = -(res);                                 \
            res = -1;                                         \
        }                                                     \
        return (type) (res);                                  \
    } while (0)

这个宏用于检查系统调用的返回值，并把它相应地转换为C语言的errno错误码。在Linux里，系统调用使用返回值传递错误码，如果返回值为负数，那么表明调用失败，返回值的绝对值就是错误码。而在C语言里则不然，C语言里的大多数函数都以返回?1表示调用失败，而将出错信息存储在一个名为errno的全局变量（在多线程库中，errno存储于TLS中）里。\_\_syscall_return就负责将系统调用的返回信息存储在errno中。这样，fork函数在汇编之后，就会形成类似如下的汇编代码：

    fork:
    mov eax, 2
    int 0x80
    cmp eax,0xFFFFFF83
    jb syscall_noerror
    neg eax
    mov errno, eax
    mov eax,0xFFFFFFFF
    syscall_noerror:
    ret

如果系统调用本身有参数要如何实现呢？下面是x86
Linux下的syscall1，用于带1个参数的系统调用：

    #define _syscall2(type, name, type1, arg1)          \
    type name(type1 arg1)                                   \
    {                                                 \
        long __res;                                       \
        __asm__ volatile ("int $0x80"                     \
            : "=a" (__res)                                  \
            : "0" (__NR_##name), "b" ((long)(arg1))); \
        __syscall_return(type,__res);                     \
    }

这段代码和_syscall0不同的是，它多了一个"b"
((long)(arg1))。这一句的意思是先把arg1强制转换为long，然后存放在EBX（b代表EBX）里作为输入。编译器还会生成相应的代码来保护原来的EBX的值不被破坏。这段汇编可以改写为：

    push ebx
    eax = __NR_##name
    ebx = arg1
    int 0x80
    __res = eax
    pop ebx

可见，如果系统调用有1个参数，那么参数通过EBX来传入。x86下Linux支持的系统调用参数至多有6个，分别使用6个寄存器来传递，它们分别是EBX、ECX、EDX、ESI、EDI和EBP。

当用户调用某个系统调用的时候，实际是执行了以上一段汇编代码。CPU执行到int
\$0x80时，会保存现场以便恢复，接着会将特权状态切换到内核态。然后CPU便会查找中断向量表中的第0x80号元素。

以上是Linux实现系统调用入口的思路，不过也许你会想知道glibc是否真的是如此封装系统调用的？答案是否定的。glibc使用了另外一套调用系统调用的方法，尽管原理上仍然是使用0x80号中断，但细节上却是不一样的。由于这种方法与我们前面介绍的方法本质上是一样的，所以在这里就不介绍了。

#### 2. 切换堆栈

在实际执行中断向量表中的第0x80号元素所对应的函数之前，CPU首先还要进行栈的切换。在Linux中，用户态和内核态使用的是不同的栈，两者各自负责各自的函数调用，互不干扰。但在应用程序调用0x80号中断时，程序的执行流程从用户态切换到内核态，这时程序的当前栈必须也相应地从用户栈切换到内核栈。从中断处理函数中返回时，程序的当前栈还要从内核栈切换回用户栈。

所谓的"当前栈"，指的是ESP的值所在的栈空间。如果ESP的值位于用户栈的范围内，那么程序的当前栈就是用户栈，反之亦然。此外，寄存器SS的值还应该指向当前栈所在的页。所以，将当前栈由用户栈切换为内核栈的实际行为就是：

1.  保存当前的ESP、SS的值。
2.  将ESP、SS的值设置为内核栈的相应值。

反过来，将当前栈由内核栈切换为用户栈的实际行为则是：

1.  恢复原来ESP、SS的值。
2.  用户态的ESP和SS的值保存在哪里呢？答案是内核栈上。这一行为由i386的中断指令自动地由硬件完成。

当0x80号中断发生的时候，CPU除了切入内核态之外，还会自动完成下列几件事：

1.  找到当前进程的内核栈（每一个进程都有自己的内核栈）。
2.  在内核栈中依次压入用户态的寄存器SS、ESP、EFLAGS、CS、EIP。

而当内核从系统调用中返回的时候，须要调用iret指令来回到用户态，iret指令则会从内核栈里弹出寄存器SS、ESP、EFLAGS、CS、EIP的值，使得栈恢复到用户态的状态。这个过程可以用图12-4来表示。

![](../Images/12-4.jpg)\
图12-4 中断时用户栈和内核栈切换

#### 3. 中断处理程序

在int指令合理地切换了栈之后，程序的流程就切换到了中断向量表中记录的0x80号中断处理程序。Linux内部的i386中断服务流程如图12-5所示。

![](../Images/12-5.jpg)\
图12-5 Linux i386中断服务流程

i386的中断向量表在Linux源代码的Linux/arch/i386/kernel/traps.c里可见一部分。在该文件的末尾，我们能看到一个函数trap_init，该函数用于初始化中断向量表：

    void __init trap_init(void)
    {
        ......

        set_trap_gate(0,&divide_error);
        set_intr_gate(1,&debug);
        set_intr_gate(2,&nmi);
        set_system_intr_gate(3, &int3);    set_system_gate(4,&overflow);
        set_system_gate(5,&bounds);
        set_trap_gate(6,&invalid_op);
        set_trap_gate(7,&device_not_available);
        set_task_gate(8,GDT_ENTRY_DOUBLEFAULT_TSS);
        set_trap_gate(9,&coprocessor_segment_overrun);
        set_trap_gate(10,&invalid_TSS);
        set_trap_gate(11,&segment_not_present);
        set_trap_gate(12,&stack_segment);
        set_trap_gate(13,&general_protection);
        set_intr_gate(14,&page_fault);
        set_trap_gate(15,&spurious_interrupt_bug);
        set_trap_gate(16,&coprocessor_error);
        set_trap_gate(17,&alignment_check);
    #ifdef CONFIG_X86_MCE
        set_trap_gate(18,&machine_check);
    #endif
        set_trap_gate(19,&simd_coprocessor_error);

        set_system_gate(SYSCALL_VECTOR,&system_call);

        ......
    }

以上代码中的函数set_intr_gate/set_trap_gate/set_system_gate/set_system_intr_gate用于设置某个中断号上的中断处理程序。之所以区分为3种名字，是因为在i386下对中断有更加细致的划分，限于篇幅这里就不详细介绍了，读者在这里可以暂时将它们都等同对待。

从这段代码可以看到0～19号中断对应的中断处理程序，其中包含算数异常（除零、溢出）、页缺失（page
fault）、无效指令等。在最后一行：

    set_system_gate(SYSCALL_VECTOR,&system_call);

可看出这是系统调用对应的中断号，在Linux/include/asm-i386/mach-default/irq_vectors.h里可以找到SYSCALL_VECTOR的定义：

    #define SYSCALL_VECTOR        0x80

可见i386下Linux的系统调用对应的中断号确实是0x80。必然的，用户调用int
0x80之后，最终执行的函数是system_call，该函数在Linux/arch/i386/kernel/entry.S里可以找到定义。但很遗憾，这段代码是由汇编写成并且篇幅较长，因此必须一段一段选择性地研究：

    main -> fork -> int 0x80 -> system_call:

    ENTRY(system_call)
        ......
        SAVE_ALL
        ......
        cmpl $(nr_syscalls), %eax
        jae syscall_badsys

这一段是system_call的开头，中间省略了一些不太重要的代码。在这里一开始使用宏SAVE_ALL将各种寄存器压入栈中，以免它们的值被后续执行的代码所覆盖。然后接下来使用cmpl指令比较eax和nr_syscalls的值，nr_syscalls是比最大的有效系统调用号大1的值，因此，如果eax（即用户传入的系统调用号）大于等于nr_syscalls，那么这个系统调用就是无效的，如果这样，接着就会跳转到后面的syscall_badsys执行。如果系统调用号是有效的，那么程序就会执行下面的代码：

    syscall_call:
        call *sys_call_table(0,%eax,4)
        ......
        RESTORE_REGS
        ......
        iret

确定系统调用号有效并且保存了寄存器之后，接下来要执行的就是调用\*sys_call_table
(0,%eax,4)来查找中断服务程序并执行。执行结束之后，使用宏RESTORE_REGS来恢复之前被SAVE_ALL保存的寄存器。最后通过指令iret从中断处理程序中返回。

究竟什么是\*sys_call_table(0,%eax,4)呢？我们在Linux/arch/i386/kernel/syscall_table.S里能找到定义：

    .data
    ENTRY(sys_call_table)
        .long sys_restart_syscall    
        .long sys_exit
        .long sys_fork
        .long sys_read
        .long sys_write
        ......

这就是Linux的i386系统调用表，这个表里的每一个元素（long，4字节）都是一个系统调用函数的地址。那么不难推知\*sys_call_table(0,%eax,4)指的是sys_call_table上偏移量为0+%eax
\*
4上的那个元素的值指向的函数，也就是%eax所记录的系统调用号所对应的系统调用函数（见图12-6）。接下来系统就会去调用相应的系统调用函数。例如，如果%eax=2，那么sys_fork就会调用。

> 内核里的系统调用函数往往以sys_加上系统调用函数名来命名，例如sys_fork、sys_open等。

整个调用过程如图12-6所示。

![](../Images/12-6.jpg)\
图12-6 Linux系统调用流程

> **Q&A**
>
> **Q：**内核里以sys开头的系统调用函数是如何从用户那里获得参数的？
>
> **A：**我们知道用户调用系统调用时，根据系统调用参数数量的不同，依次将参数放入EBX、ECX、EDX、ESI、EDI和EBP这6个寄存器中传递。例如一个参数的系统调用就是用EBX，而两个参数的系统调用就使用EBX和ECX，以此类推。
>
> 在进入系统调用的服务程序system_call的时候，system_call调用了一个宏SAVE_ALL来保存各个寄存器，由于篇幅原因我们没有在正文中仔细讲解SAVE_ALL。不过SAVE_ALL实际与系统调用的参数传递息息相关，所以有必要在这里提一下。
>
> SAVE_ALL的作用为保存寄存器，因此其内容就是将各个寄存器压入栈中。SAVE_ALL的大致内容如下：
>
>      #define SAVE_ALL \
>             ......
>             push %eax
>             push %ebp
>             push %edi
>             push %esi
>             push %edx
>             push %ecx
>             push %ebx
>             mov $(KERNEL_DS), %edx
>             mov %edx, %ds
>             mov %edx, %es 
>
> 抛开SAVE_ALL的最后3个mov指令不看（这3条指令用于设置内核数据段，它们不影响栈），我们可以发现SAVE_ALL的一系列push指令的最后6条所压入栈中的寄存器恰好就是用来存放系统调用参数的6个寄存器，连顺序都一样，这当然不是一个巧合。
>
> 再回到system_call的代码，我们可以发现，在执行SAVE_ALL与执行call
> \*sys_call_table(0,%eax,4)之间，没有任何代码会影响到栈。因此刚刚进入sys开头的内核系统调用函数的时候，栈上恰好是这样的情景，如图12-7所示。
>
> ![](../Images/12-7.jpg)\
> 图12-7 系统调用时堆栈分布
>
> 可以说，系统调用的参数被SAVE_ALL"阴差阳错"地放置在了栈上。
>
> 另一方面，所有以sys开头的内核系统调用函数，都有一个asmlinkage的标识，例如：asmlinkage
> pid_t sys_fork(void);
>
> asmlinkage是一个宏，定义为：\_\_attribute\_\_ ((regparm(0)))
>
> 这个扩展关键字的意义是让这个函数只从栈上获取参数。因为gcc对普通函数有优化措施，会使用寄存器来传递参数，而SAVE_ALL将参数全部放置于栈上，因此必须使用asmlinkage来强迫函数从栈上获取参数。这样一来，内核里的系统调用函数就可以正确地获取用户提供的参数了。整个过程可以用图12-8表示。
>
> ![](../Images/12-8.jpg)\
> 图12-8 Linux系统调用中如何向内核传递参数

### 12.2.3 Linux的新型系统调用机制

由于基于int指令的系统调用在奔腾4代处理器上性能不佳，Linux在2.5版本起开始支持一种新型的系统调用机制。这种新机制使用Intel在奔腾2代处理器就开始支持的一组专门针对系统调用的指令------sysenter和sysexit。在本节中，我们将对这种新系统调用机制进行一个初步的了解。

如果使用ldd来获取一个可执行文件的共享库的依赖情况，你会发现一些奇怪的现象：

    $ ldd /bin/ls
            linux-gate.so.1 =>  (0xffffe000)
            librt.so.1 => /lib/tls/i686/cmov/librt.so.1 (0xb7f7a000)
            libacl.so.1 => /lib/libacl.so.1 (0xb7f74000)
            libselinux.so.1 => /lib/libselinux.so.1 (0xb7f5e000)
            libc.so.6 => /lib/tls/i686/cmov/libc.so.6 (0xb7e2d000)
            libpthread.so.0 => /lib/tls/i686/cmov/libpthread.so.0 (0xb7e1b000)
            /lib/ld-linux.so.2 (0xb7f97000)
            libattr.so.1 => /lib/libattr.so.1 (0xb7e17000)
            libdl.so.2 => /lib/tls/i686/cmov/libdl.so.2 (0xb7e13000)
            libsepol.so.1 => /lib/libsepol.so.1 (0xb7dd2000)

我们可以看到linux-gate.so.1没有与任何实际的文件相对应，这个共享库在前面分析Linux共享库的时候也与它碰过面，但是当时没有深入地分析它。那么这个库究竟是做什么的呢？答案正是Linux用于支持新型系统调用的"虚拟"共享库。linux-gate.so.1并不存在实际的文件，它只是操作系统生成的一个虚拟动态共享库（Virtual
Dynamic Shared
Library，VDSO）。这个库总是被加载在地址0xffffe000的位置上。我们可以通过Linux的proc文件系统来查看一个可执行程序的内存映像，看看能不能找到这个虚拟文件：

    $ cat /proc/self/maps
    08048000-0804c000 r-xp 00000000 08:01 13271      /bin/cat
    0804c000-0804d000 rw-p 00003000 08:01 13271      /bin/cat
    ......
    bfd65000-bfd7a000 rw-p bffeb000 00:00 0          [stack]
    ffffe000-fffff000 r-xp 00000000 00:00 0          [vdso]

命令cat
/proc/self/maps可以查看cat命令自己的内存布局。我们可以看见地址0xffffe000到0xfffff000的地方被映射了vdso，也就是linux-gate.so.1。这个虚拟文件的大小为4096个字节。因为这个文件在任何进程里都处于相同的位置，因此可以用如下方法将它导出到一个真实的文件里：

    $dd if=/proc/self/mem of=linux-gate.dso bs=4096 skip=1048574 count=1

此时，linux-gate.dso的内容就是vdso的内容。接下来就可以用各种工具来分析它了。首先用objdump来看看这个文件里有什么：

    $ objdump -T linux-gate.dso

    linux-gate.dso：     文件格式 elf32-i386

    DYNAMIC SYMBOL TABLE:
    ffffe400 l    d  .text  00000000              .text
    ffffe478 l    d  .eh_frame_hdr  00000000              .eh_frame_hdr
    ffffe480 l    d  .eh_frame    00000000              .eh_frame
    ffffe604 l    d  .useless     00000000              .useless
    ffffe400 g    DF .text  00000014  LINUX_2.5   __kernel_vsyscall
    00000000 g    DO *ABS*  00000000  LINUX_2.5   LINUX_2.5
    ffffe440 g    DF .text  00000007  LINUX_2.5   __kernel_rt_sigreturn
    ffffe420 g    DF .text  00000008  LINUX_2.5   __kernel_sigreturn

可以看到，vdso导出了一系列函数，当然这里最值得关心的是\_\_kernel_vsyscall函数。这个函数负责进行新型的系统调用。现在来看看这个函数的内容:

    objdump -d --start-address=0xffffe400 --stop-address=0xffffe408 linux-gate.dso

该命令从0xffffe400处开始反汇编8个字节，让我们看看结果：

    $ objdump -d --start-address=0xffffe400 --stop-address=0xffffe414 linux-gate.dso

    linux-gate.dso：     文件格式 elf32-i386

反汇编 .text 节：

    ffffe400 <__kernel_vsyscall>:
    ffffe400:       51              push   %ecx
    ffffe401:       52              push   %edx
    ffffe402:       55              push   %ebp
    ffffe403:       89 e5           mov    %esp,%ebp
    ffffe405:       0f 34           sysenter
    ffffe407:       90              nop

在这里出现了一个以前没见过的汇编指令sysenter。这就是Intel在奔腾2代处理器开始提供支持的新型系统调用指令。调用sysenter之后，系统会直接跳转到由某个寄存器指定的函数执行，并自动完成特权级转换、堆栈切换等功能。

在参数传递方面，新型的系统调用和使用int的系统调用完全一样，仍然使用EBX、ECX、EDX、ESI、EDI和EBP这6个寄存器传递。在内核里也是通过SAVE_ALL将这些参数放置在栈上。因此，我们可以自己调用这个\_\_kernel_vsyscall函数来试试：

> **【小实验】**
>
> 人工调用系统调用：
>
>     int main() {
>         int ret;
>         char msg[] = "Hello\n";
>         __asm__ volatile (
>             "call *%%esi"
>             : "=a" (ret)
>             : "a" (4),
>             "S" (0xffffe400),
>             "b" ((long) 1),
>             "c" ((long) msg),
>             "d" ((long) sizeof(msg)));
>         return 0;
>     }
>
> 读者应该还记得，在Linux下fd=1表示stdout。因此向fd=1写入数据等效于向命令行输出，这个例子就是这个目的。我们在main函数里将\_\_kernel_vsyscall函数的地址赋值给esi("S"表示esi)，并且使用指令call调用这个地址。与此同时，还在eax中放入了系统调用write的调用号(4)，在ebx、ecx、edx中放入write的参数，这样就完成了一次系统调用，在屏幕上输出了Hello。
>
> 关于使用sysenter指令进入内核之后是如何执行的，在这里就不占用篇幅详细介绍了，如果读者有兴趣,可以参考Intel的CPU指令手册，并且结合阅读Linux的内核源代码中关于sysenter的实现代码：/arch/i386/kernel/sysenter.c。

> **Q&A**
>
> **Q：**dd if=/proc/self/mem of=linux-gate.dso bs=4096 skip=1048574
> count=1这个命令是如何得到vdso的印像文件的？
>
> **A：**dd的作用为复制文件，if参数代表输入的文件，而of参数代表输出的文件。/proc/self/
> mem总是等价于当前进程的内存快照，换句话说，这个文件的内容就是dd的内存内容。参数bs代表dd一次性需要搬运的字节数（这称为一个块），skip代表需要从文件开头处跳过多少个块。count则表示须要搬运多少个块。
>
> 了解了dd参数的含义之后，这个命令的作用就清晰了。我们希望复制dd的内存映像里地址0xffffe000之后的count=1个块（这里块大小=bs=0x1000=4096），那么就需要跳过前面0xffffe000个字节，也就是0xffffe000/0x1000=FFFFE=1048574个块，因此skip设置为1048574。将这些数据输出为linux-gate.dso，就得到了这个虚拟文件的映像。
