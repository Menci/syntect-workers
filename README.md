# Syntect on Cloudflare Workers

Syntect is a syntax highlighter written in Rust. This project runs WebAssembly build of syntect on Cloudflare Workers to provide a code highlighting API.

The API service generates HTML output of highlighting, which should be used with a CSS stylesheet generated from a `.tmTheme` file. A prefix could be added to the class names to avoid conflict with your website's existing styles.

The highlighting result is independent of the theme (unlike [Shiki](https://github.com/shikijs/shiki)) so you can switch themes in your website by only switching CSS.

> My Worker is running on https://syntect.menci.workers.dev. It comes with no warranty and it's recommended to host your own.

# API Usage

## Generate CSS with TextMate .tmTheme theme file

You can get `.tmTheme` files by Googling "textmate 2 themes". If you get a theme file's URL on the Internet, you can generate CSS stylesheet with:

```
GET /css?themeUrl=<URL of .tmTheme>&prefix=<CSS class prefix>
```

For example, the [GitHub Light](https://syntect.menci.workers.dev/css?themeUrl=https%3A%2F%2Fraw.githubusercontent.com%2Fchriskempson%2Ftomorrow-theme%2Fmaster%2Ftextmate%2FTomorrow.tmTheme&prefix=hl-) theme.

You can also use your local `.tmTheme` file:

```
POST /css {
  themeData: <text content of .tmTheme>,
  prefix: <CSS class prefix>
}
```

**Note**: Don't use the `GET /css` link directly in your HTML document since generating CSS is a little slow. It's better to save the result and serve the static CSS file in your website.

## Highlight your code

To get highlighted HTML of some code:

```
POST /highlight {
  code: <your code to highlight>,
  language: <the language of your code>
}
```

The response is highlighted HTML.

For verbose output (including resolved language name):

```
POST /highlight {
  code: <your code to highlight>,
  language: <the language of your code>,
  verbose: 1
}
```

The response is:

```
{
  html: <highlighted HTML>,
  language: <the display name of highlighted language>
}
```

**Note**: With free Workers plan the CPU time is limited to 10ms (50ms for paid plan). So large files could not be highlighted.

# Deploying

Build and deploy this project with [Cloudflare Wrangler](https://developers.cloudflare.com/workers/cli-wrangler).
