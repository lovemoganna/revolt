+++
title = "cp command"
date = 2020-03-15T00:00:00+08:00
lastmod = 2020-03-15T16:53:29+08:00
tags = ["linux_command"]
categories = ["linux"]
draft = false
locale = "zh_CN"
autoCollapseToc = true
+++

linux command cp demo test.

<!--more-->


## TARGET-覆盖掉已经过时的配置文件 {#target-覆盖掉已经过时的配置文件}

-   缺点：很不地道。强买强干。看不到渐变过程。
-   优点：很干脆，暴力。
    
    所以后期后过渡到git管理配置文件上面。


## CP命令简介 {#cp命令简介}

```nil
用法：cp [选项]... [-T] 源文件 目标文件
　或：cp [选项]... 源文件... 目录
　或：cp [选项]... -t 目录 源文件...
将指定<源文件>复制至<目标文件>，或将多个<源文件>复制至<目标目录>。

必选参数对长短选项同时适用。
-a, --archive			等于-dR --preserve=all
--attributes-only	仅复制属性而不复制数据      --backup[=CONTROL		为每个已存在的目标文件创建备份
-b				类似--backup 但不接受参数
--copy-contents		在递归处理是复制特殊文件内容
-d				等于--no-dereference --preserve=links
-f, --force                  if an existing destination file cannot be
opened, remove it and try again (this option
is ignored when the -n option is also used)
-i, --interactive            prompt before overwrite (overrides a previous -n
option)
-H                           follow command-line symbolic links in SOURCE
-l, --link                   hard link files instead of copying
-L, --dereference            always follow symbolic links in SOURCE
-n, --no-clobber		不要覆盖已存在的文件(使前面的 -i 选项失效)
-P, --no-dereference		不跟随源文件中的符号链接
-p				等于--preserve=模式,所有权,时间戳
--preserve[=属性列表	保持指定的属性(默认：模式,所有权,时间戳)，如果
可能保持附加属性：上下文、链接、xattr 等
--sno-preserve=属性列表	不保留指定的文件属性
--parents			复制前在目标目录创建来源文件路径中的所有目录
-R, -r, --recursive		递归复制目录及其子目录内的所有内容
--reflink[=WHEN]		控制克隆/CoW 副本。请查看下面的内如。
--remove-destination	尝试打开目标文件前先删除已存在的目的地
文件 (相对于 --force 选项)
--sparse=WHEN		控制创建稀疏文件的方式
--strip-trailing-slashes	删除参数中所有源文件/目录末端的斜杠
-s, --symbolic-link		只创建符号链接而不复制文件
-S, --suffix=后缀		自行指定备份文件的后缀
-t,  --target-directory=目录	将所有参数指定的源文件/目录
复制至目标目录
-T, --no-target-directory	将目标目录视作普通文件
-u, --update			只在源文件比目标文件新，或目标文件
不存在时才进行复制
-v, --verbose		显示详细的进行步骤
-x, --one-file-system	不跨越文件系统进行操作
-Z                           set SELinux security context of destination
file to default type
--context[=CTX]          like -Z, or if CTX is specified then set the
SELinux or SMACK security context to CTX
--help		显示此帮助信息并退出
--version		显示版本信息并退出

By default, sparse SOURCE files are detected by a crude heuristic and the
corresponding DEST file is made sparse as well.  That is the behavior
selected by --sparse=auto.  Specify --sparse=always to create a sparse DEST
file whenever the SOURCE file contains a long enough sequence of zero bytes.
Use --sparse=never to inhibit creation of sparse files.

When --reflink[=always] is specified, perform a lightweight copy, where the
data blocks are copied only when modified.  If this is not possible the copy
fails, or if --reflink=auto is specified, fall back to a standard copy.
Use --reflink=never to ensure a standard copy is performed.

备份文件的后缀为"~"，除非以--suffix 选项或是 SIMPLE_BACKUP_SUFFIX
环境变量指定。版本控制的方式可通过--backup 选项或 VERSION_CONTROL 环境
变量来选择。以下是可用的变量值：

none, off       不进行备份(即使使用了--backup 选项)
numbered, t     备份文件加上数字进行排序
existing, nil   若有数字的备份文件已经存在则使用数字，否则使用普通方式备份
simple, never   永远使用普通方式备份

有一个特别情况：如果同时指定--force 和--backup 选项，而源文件和目标文件
是同一个已存在的一般文件的话，cp 会将源文件备份。

GNU coreutils 在线帮助：<https://www.gnu.org/software/coreutils/>
Full documentation <https://www.gnu.org/software/coreutils/cp>
或者在本地使用：info '(coreutils) cp invocation'
```