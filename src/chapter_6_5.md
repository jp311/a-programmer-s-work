## 6.5 Linux内核装载ELF过程简介

当我们在Linux系统的bash下输入一个命令执行某个ELF程序时，Linux系统是怎样装载这个ELF文件并且执行它的呢？

首先在用户层面，bash进程会调用fork()系统调用创建一个新的进程，然后新的进程调用execve()系统调用执行指定的ELF文件，原先的bash进程继续返回等待刚才启动的新进程结束，然后继续等待用户输入命令。execve()系统调用被定义在unistd.h，它的原型如下：

    int execve(const char *filename, char *const argv[], char *const envp[]);

它的三个参数分别是被执行的程序文件名、执行参数和环境变量。Glibc对execvp()系统调用进行了包装，提供了execl()、execlp()、execle()、execv()和execvp()等5个不同形式的exec系列API，它们只是在调用的参数形式上有所区别，但最终都会调用到execve()这个系统中。下面是一个简单的使用fork()和execlp()实现的minibash：

    #include <stdio.h>
    #include <sys/types.h>
    #include <unistd.h>

    int main()
    {
        char buf[1024] = {0};
        pid_t pid;
        while(1) {
            printf("minibash$");
            scanf("%s", buf);
            pid = fork();
            if(pid == 0) {
                if(execlp(buf, 0 ) < 0) {
                    printf("exec error\n");
                }
            } else if(pid > 0){
                int status;
                waitpid(pid,&status,0);
            } else {
                printf("fork error %d\n",pid);
            }
        }
        return 0;
    }

在进入execve()系统调用之后，Linux内核就开始进行真正的装载工作。在内核中，execve()系统调用相应的入口是sys_execve()，它被定义在arch\\i386\\kernel\\Process.c。sys_execve()进行一些参数的检查复制之后，调用do_execve()。do_execve()会首先查找被执行的文件，如果找到文件，则读取文件的前128个字节。为什么要这么做呢？因为我们知道，Linux支持的可执行文件不止ELF一种，还有a.out、Java程序和以"#!"开始的脚本程序。Linux还可以支持更多的可执行文件格式，如果某一天Linux须支持Windows
PE的可执行文件格式，那么我们可以编写一个支持PE装载的内核模块来实现Linux对PE文件的支持。这里do_execve()读取文件的前128个字节的目的是判断文件的格式，每种可执行文件的格式的开头几个字节都是很特殊的，特别是开头4个字节，常常被称做魔数（Magic
Number），通过对魔数的判断可以确定文件的格式和类型。比如ELF的可执行文件格式的头4个字节为0x7F、'e'、'l'、'f'；而Java的可执行文件格式的头4个字节为'c'、'a'、'f'、'e'；如果被执行的是Shell脚本或perl、python等这种解释型语言的脚本，那么它的第一行往往是"#!/bin/sh"或"#!/usr/bin/perl"或"#!/usr/bin/python"，这时候前两个字节'#'和'!'就构成了魔数，系统一旦判断到这两个字节，就对后面的字符串进行解析，以确定具体的解释程序的路径。

当do_execve()读取了这128个字节的文件头部之后，然后调用search_binary_handle()去搜索和匹配合适的可执行文件装载处理过程。Linux中所有被支持的可执行文件格式都有相应的装载处理过程，search_binary_handle()会通过判断文件头部的魔数确定文件的格式，并且调用相应的装载处理过程。比如ELF可执行文件的装载处理过程叫做load_elf_binary()；a.out可执行文件的装载处理过程叫做load_aout_binary()；而装载可执行脚本程序的处理过程叫做load_script()。这里我们只关心ELF可执行文件的装载，load_elf_binary()被定义在fs/Binfmt_elf.c，这个函数的代码比较长，它的主要步骤是：

1.  检查ELF可执行文件格式的有效性，比如魔数、程序头表中段（Segment）的数量。
2.  寻找动态链接的".interp"段，设置动态链接器路径（与动态链接有关，具体请参考第9章）。
3.  根据ELF可执行文件的程序头表的描述，对ELF文件进行映射，比如代码、数据、只读数据。
4.  初始化ELF进程环境，比如进程启动时EDX寄存器的地址应该是DT_FINI的地址（参照动态链接）。
5.  将系统调用的返回地址修改成ELF可执行文件的入口点，这个入口点取决于程序的链接方式，对于静态链接的ELF可执行文件，这个程序入口就是ELF文件的文件头中e_entry所指的地址；对于动态链接的ELF可执行文件，程序入口点是动态链接器。

当load_elf_binary()执行完毕，返回至do_execve()再返回至sys_execve()时，上面的第5步中已经把系统调用的返回地址改成了被装载的ELF程序的入口地址了。所以当sys_execve()系统调用从内核态返回到用户态时，EIP寄存器直接跳转到了ELF程序的入口地址，于是新的程序开始执行，ELF可执行文件装载完成。
