# Photo library and deployment constraints

Status: metadata-only inventory. No image content was opened, decoded, copied, modified, or downloaded during discovery. Counts are observations, not importer results.

## Windows source

Root: `D:\Cloud\OneDrive - Š&P Outdoor\Media\Fotky\Fotky Trail Maniacs\2026\`

Only these two subtrees are approved:

| Relative directory | JPEG files | Logical bytes |
| --- | ---: | ---: |
| Hana Valdová/watermarked | 963 | 608175706 |
| Pepa Horák/watermarked | 719 | 624891876 |
| Total | 1682 | 1233067582 |

- Approximately 1.233 decimal GB; all inventoried files have .jpg extensions.
- No duplicate basenames found, compared case-insensitively across both directories.
- No offline/recall flags detected in the inspected file metadata. This does not prove decoding success or guarantee future OneDrive residency.
- Import must explicitly allowlist these subtrees; never ingest sibling originals by scanning the whole year indiscriminately.
- Do not copy photos into this repository or request another cloud download. Use existing local files read-only.
- If future files are cloud-only, stop and report them before reading content rather than silently triggering hydration.

## Portable identification and export

- Store paths relative to the year root using forward slashes, for example `Hana Valdová/watermarked/<filename>.jpg`.
- Preserve filename spelling and Unicode accents. Do not use absolute Windows paths as database identities.
- CSV should contain filename and relative_path so a separate local script can select the files deterministically.
- No app feature for downloading originals or ZIP archives. Browsers necessarily fetch image previews to display them; this is distinct from an image-export workflow.
- Confirm separately if the later script must pick unwatermarked originals: do not assume filename/path mapping without inspecting it under explicit scope.

## Development and deployment

- Development/testing runs on Windows.
- Production runs inside a Linux LXC on Proxmox.
- The Windows D: source path will not be valid in Linux. Configure the Linux library root independently and preserve the same relative directory structure.
- Existing photos must be made available to the container through an agreed mount or one-time transfer; no automatic cloud integration or duplicate download is planned.
- Keep the SQLite database and preview cache on durable container-local storage, separate from any read-only photo mount and outside OneDrive synchronization.

## Scope cautions

- No passwords is accepted scope, but names provide attribution only: anybody with access can select another player. Prefer LAN/VPN access over an unauthenticated public service.
- Unrestricted re-review is accepted scope: even the previous judge or return requester may receive the photo next. The audit trail provides transparency, not independent-review enforcement.
- Repeated challenges can prevent a final stable set. Track rounds/history and surface outstanding pending photos; do not introduce voting rules or limits without approval.
