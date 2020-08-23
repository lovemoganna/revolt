<script>
 export let src, string, count,button_content
 import Nested from './Nested.svelte'

 import LogRocket from 'logrocket'
 LogRocket.init('1aufxy/sveltejs')

 $: doubled = count * 2


 // Start using modular practice SvelteJS
 import Basic from './Introduction/1-basic.svelte'
 import DynamicAttributes from './Introduction/2-dynamic-attributes.svelte'
 import PStyling from './Introduction/3-pstyling.svelte'
 import HtmlTag from './Introduction/4-html-tags.svelte'
 import Button, { handleClick } from './reactivity/1-assignments.svelte'
</script>

<main>

    <Basic name="小明"></Basic>

    <DynamicAttributes alt="Shopping Girl" src={src}></DynamicAttributes>

    <PStyling></PStyling>

    <HtmlTag string={string}></HtmlTag>


    <div class="styling nested components">
        <p>Import Nested components</p>
        <Nested></Nested>
    </div>

    <Button count={0} on:click={handleClick}>{button_content}</Button>

    <div class="styling reactivity assignments">
        <p>Svelte的核心是功能强大的反应系统，用于使DOM与您的应用程序状态
            保持同步</p>
        <p>下面是一个响应事件DEMO</p>
    </div>

    <!-- <div class="styling reactivity declarations">
         <p>当你的组件状态发生改变的时候，Svelte 会自动更新DOM</p>
         <p>通常组件某些部分的状态需要由其他部分来计算，例如， fullname
         来自于 firstname 和 lastname</p>
         <Button on:click={handleClick}>
         Clicked {count} {count === 1 ? 'time':'times'}
         </Button>
         <p>Clicked {count} doubled is {doubled}</p>
	 </div> -->

</main>
