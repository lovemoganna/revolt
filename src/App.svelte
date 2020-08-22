<script>
    export let src, string, count
    import Nested from './Nested.svelte'

    import LogRocket from 'logrocket'
    LogRocket.init('1aufxy/sveltejs')

    $: doubled = count * 2

    function handleClick() {
        count += 1
    }

    // Start using modular practice SvelteJS
  import Basic from './Introduction/1-basic.svelte'
  import DynamicAttributes from './Introduction/2-dynamic-attributes.svelte'
</script>

<main>
  <Basic name="小明"></Basic>
  <DynamicAttributes alt="Shopping Girl" src={src}></DynamicAttributes>

    <!-- <img alt="微博 {name.toUpperCase()} Shopping" src={src} /> -->

    <div class="styling">
        <p>Image resources reference Shorthand attributes</p>
        <img alt="A Shopping girl" src={src} />
    </div>

    <div class="styling">
        <p>This is paragraph.</p>
    </div>

    <div class="styling nested components">
        <p>Import Nested components</p>
        <Nested></Nested>
    </div>

    <div class="styling">
        <p>HTML tags</p>
        <p>有些时候你想直接在一个组件中直接渲染 html</p>
        <p>{@html string}</p>
    </div>

    <div class="styling reactivity assignments">
        <p>Svelte的核心是功能强大的反应系统，用于使DOM与您的应用程序状态
            保持同步</p>
        <p>下面是一个响应事件DEMO</p>
    </div>

    <div class="styling reactivity declarations">
        <p>当你的组件状态发生改变的时候，Svelte 会自动更新DOM</p>
        <p>通常组件某些部分的状态需要由其他部分来计算，例如， fullname
            来自于 firstname 和 lastname</p>
        <button on:click="{handleClick}">
            Clicked {count} {count === 1 ? 'time':'times'}
        </button>
        <p>Clicked {count} doubled is {doubled}</p>
    </div>

    <div class="Nested button">

    </div>
</main>

<style>
    .styling p {
        color: purple;
        font-family: Hack;
        font-size: 2em;
    }
</style>
