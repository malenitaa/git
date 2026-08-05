# How to put this online (no coding needed)

This guide is for you if you've never used a terminal or "GitHub for
programmers" — you just want your own copy of the page working, with a
link you can send to someone.

No software to install on your computer. Everything happens in the
browser.

## Recommended option: GitHub Pages (free)

### Step 1 — Create a GitHub account

If you already have one, skip to step 2.

1. Go to [github.com](https://github.com) and click **Sign up**.
2. Follow the steps (email, password, username).

### Step 2 — Create a new repository

A "repository" here is just a folder where the page's files will live.

1. Top right, click the **+** and choose **New repository**.
2. Give it a name, for example `my-creatures`.
3. Leave it as **Public**.
4. Click **Create repository**.

### Step 3 — Upload the files

1. On the newly created repository's page, look for the link that says
   **uploading an existing file** (or the **Add file → Upload files**
   button).
2. Drag and drop these 4 files there (the same ones in this project
   folder):
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md` (optional, doesn't affect how it works)
3. Scroll down and click **Commit changes** (or "Save changes").

### Step 4 — Turn on GitHub Pages

1. In the repository, go to the **Settings** tab.
2. In the left menu, find **Pages**.
3. Where it says **Branch**, pick `main` (or whichever you have) and the
   `/ (root)` folder.
4. Click **Save**.
5. Wait a minute and refresh the page. A message with your link will
   show up, something like:

   `https://your-username.github.io/my-creatures/`

### Step 5 — Use it

Open that link and add `?user=` plus the GitHub username you want to
see hopping around, for example:

```
https://your-username.github.io/my-creatures/?user=torvalds
```

You can also just type the username in the search box at the top of the
page, without touching the link.

### To share it

Once you've loaded a username, a button with a chain icon (🔗) shows up
top right. Click it and the link (already including the username) gets
copied automatically — paste it wherever you want to send it.

## Alternative option: Vercel (also free, a bit faster)

1. Go to [vercel.com](https://vercel.com) and create an account (you can
   sign in directly with your GitHub account).
2. Click **Add New → Project**.
3. Pick the repository you created in Step 2 above.
4. Leave all the default options and click **Deploy**.
5. In about a minute you'll get a link like
   `https://my-creatures.vercel.app`.

## What if I don't want to put anything online?

You can open the `index.html` file directly on your computer by
double-clicking it, but **it won't be able to load GitHub's data**
(browsers block that kind of request when the file is opened this way,
without being "hosted" anywhere). To make it actually work, you need one
of the two options above.

## Something went wrong

- **"user @username not found"**: check that the GitHub username is
  spelled correctly (no `@`, no spaces).
- **The page loads but no creatures show up**: that user may not have
  recent public activity. Try another username, like `torvalds`.
- **Nothing shows up when opening the GitHub Pages link**: wait 1-2
  minutes after Step 4, it sometimes takes a moment to activate the
  first time.
