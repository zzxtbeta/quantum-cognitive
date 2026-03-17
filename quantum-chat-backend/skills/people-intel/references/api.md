# People Intel API Reference

Use this reference only when you need endpoint details.

## Auth

- Header: `X-API-Key: <QUANTUM_API_KEY>`
- Base URL: `<QUANTUM_API_BASE_URL>`
- The configured base already includes `/api` at runtime, so endpoint paths stay as `/institutions/search` and `/people/search`.

## 1. Institution summary search

### `GET {base_url}/institutions/search`

Use this as the entry point for institution-driven research.

When to use:
- The user asks about which institutions are active in a field
- The user asks for key institutions, labs, companies, or organizations
- You need to know whether an institution is already present in the private database before attempting people lookup

Parameters:

| param | type | required | notes |
|---|---|---|---|
| `keyword` | string | no | fuzzy match on `name_cn` / `name_en` / `standardized_name` |
| `institution_type` | string | no | semantic enum such as `university`, `research_institute` |
| `country` | string | no | exact country match |
| `page` | int | no | default `1` |
| `page_size` | int | no | default `20` |

Compact response fields:

| field | meaning |
|---|---|
| `institution_id` | stable primary key |
| `display_name` | preferred display name |
| `standardized_name` | canonical institution name |
| `institution_type` / `institution_type_label` | type summary |
| `country` / `region` | geography |
| `member_count` | covered members in private DB |
| `paper_count` | covered papers in private DB |

Workflow rule:
- If the institution is found here, use its names as aliases for `search_researchers(...)`.
- If it is not found here, do not waste extra private-db queries; move to `search_web(...)`.

## 2. Researcher search

### `GET {base_url}/people/search`

Use this only after you know the institution coverage or when you are looking up a specific person.

Parameters:

| param | type | required | notes |
|---|---|---|---|
| `institution` | array<string> | conditionally | fuzzy OR match across institution aliases |
| `name` | string | conditionally | exact person lookup |
| `page` | int | no | default `1` |
| `page_size` | int | no | default `20`, max `100` |

Important constraint:
- At least one of `institution` or `name` must be provided.
- Do not call this with empty filters.

Useful response fields:

| field | meaning |
|---|---|
| `name` / `name_en` | researcher name |
| `position` | title |
| `department` | unit or department |
| `email` | may be null |
| `research_areas` | tag list |
| `introduction` | raw long-form bio; mine this carefully, do not invent metrics |
| `current_institution` | current institution object |

## Recommended decision tree

1. Institution-led task:
   - `search_institutions(...)`
   - hit: `search_researchers(institution=[aliases...])`
   - miss: `search_web(...)`
2. Person-led task:
   - `search_researchers(name=...)`
   - miss: `search_web(...)`
3. Mixed market + people task:
   - first identify covered institutions
   - then separate private-db evidence from Web evidence in the output
