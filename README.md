# plane-skill

An agent skill that reads and updates a [Plane](https://plane.so) board through the Plane REST API. With it, an agent lists tickets, syncs ticket states and dates with shipped git work, and proposes new tickets for you to confirm.

The skill lives in `skills/plane/`. `SKILL.md` holds the instructions, and `scripts/plane.ts` is the Bun command-line tool the agent runs.

## Requirements

- omp
- [Bun](https://bun.sh) on your `PATH`
- A Plane personal access token, created in your Plane profile settings

## Install for omp

The repository is an omp plugin. omp keeps user plugins in `~/.omp/plugins/node_modules/`. At the start of every session, in any directory, it loads each enabled plugin whose `package.json` has an `omp` field, and it reads the skills in that plugin's `skills/` directory. That is why one install works in every project.

### Install from GitHub

1. Install the plugin:

	```sh
	omp plugin install github:cwkang1998/plane-skill
	```

	omp runs `bun install` in `~/.omp/plugins/` and records the source in `~/.omp/plugins/package.json`. Add `#<tag>` or `#<branch>` to pin a ref, for example `github:cwkang1998/plane-skill#v0.1.0`. For a private repository, set up SSH or a git credential helper first. Do not put a token in the URL.

2. Export the three settings in your shell profile, for example `~/.zshrc`:

	```sh
	export PLANE_BASE_URL=https://plane.example.com
	export PLANE_WORKSPACE=my-workspace
	export PLANE_TOKEN_FOR_AI=plane_api_...
	```

3. Start a new omp session. Sessions that are already running keep the skill list they started with.

To confirm the install, run `omp plugin list` and look for `plane-skill`. Inside a session, `skill://plane` resolves to the skill.

To get the latest commit on the installed ref, run:

```sh
omp plugin upgrade plane-skill
```

### Link a local copy for development

To test edits before you push them, link your clone instead. Run this from the root of the clone:

```sh
omp plugin link "$PWD"
```

omp creates a symlink at `~/.omp/plugins/node_modules/plane-skill` that points at your clone, so edits take effect in the next session. A link and a GitHub install use the same name. To switch from one to the other, run `omp plugin uninstall plane-skill` first.

## Configure

The script reads these environment variables. All three are required.

| Variable | Purpose |
|---|---|
| `PLANE_BASE_URL` | Plane host, for example `https://plane.example.com` |
| `PLANE_WORKSPACE` | Workspace slug, the first path segment in your Plane URLs |
| `PLANE_TOKEN_FOR_AI` | Plane personal access token, sent as `X-API-Key` |

## Use the script directly

The agent runs these commands, and you can run them too:

```sh
bun skills/plane/scripts/plane.ts issues WEB
bun skills/plane/scripts/plane.ts issues WEB "Backend"
bun skills/plane/scripts/plane.ts api GET /users/me/
bun skills/plane/scripts/plane.ts api GET '/workspaces/{ws}/projects/' --all
```

`issues` prints one tab-separated line per ticket. `api` sends any request to `/api/v1` and prints the JSON response. `{ws}` in a path expands to the workspace slug, and `--all` follows pagination on `GET` requests.

## Uninstall

```sh
omp plugin uninstall plane-skill
```
