# Installing Webfonts

Follow these simple Steps.

## 1.

Put `sentient/` Folder into a Folder called `fonts/`.

## 2.

Put `sentient.css` into your `css/` Folder.

## 3. (Optional)

You may adapt the `url('path')` in `sentient.css` depends on your Website Filesystem.

## 4.

Import `sentient.css` at the top of you main Stylesheet.

```
@import url('sentient.css');
```

## 5.

You are now ready to use the following Rules in your CSS to specify each Font Style:

```
font-family: Sentient-Extralight;
font-family: Sentient-ExtralightItalic;
font-family: Sentient-Light;
font-family: Sentient-LightItalic;
font-family: Sentient-Regular;
font-family: Sentient-Italic;
font-family: Sentient-Medium;
font-family: Sentient-MediumItalic;
font-family: Sentient-Bold;
font-family: Sentient-BoldItalic;
font-family: Sentient-Variable;
font-family: Sentient-VariableItalic;

```

## 6. (Optional)

Use `font-variation-settings` rule to controll axes of variable fonts:
wght 700.0wght 400.0

Available axes:
'wght' (range from 200.0 to 700.0'wght' (range from 200.0 to 700.0
