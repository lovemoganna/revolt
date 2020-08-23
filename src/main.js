import App from './App.svelte';

const app = new App({
    target: document.body,
    props: {
        src: "https://weiboimgs.sina.tw/upload/api_bj/us/11-1591643028.jpeg",
        string: `This string contains some <strong style='color:red'> HTML!!! </strong> in 4-html-tag components`,
        count: 0,
        logrocket: "https://cdn.lr-ingest.io/LogRocket.min.js",
        button_content: 'hello world'

    }
});

export default app;