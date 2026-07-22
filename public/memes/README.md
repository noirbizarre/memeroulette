# Local memes

Drop images here to make them available through the **Local** meme provider.

## Layout

```
public/memes/
  <category>/
    <image>.{png,jpg,jpeg,gif,webp,avif,svg}
```

- Each first-level directory is a **category**. Its display name is derived from
  the directory name (`kebab`/`snake_case` -> `Title Case`).
- Each image file inside a category is a **meme**. Its display name is derived
  from the file name (without extension), prettified the same way.
- Dotfiles, nested subdirectories, and non-image files are ignored.

The JSON registry is generated at build time by the `local-memes` Vite plugin
(`plugins/local-memes.ts`) and exposed as the `virtual:local-memes` module. In
`pnpm dev`, adding or removing files triggers a reload automatically.
