// Node 10 compatible client mirroring your Python endpoints
const fetch = require('node-fetch'); // v2
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class APIError extends Error {}

class APISpreadsheets {
    constructor({
                    accessKey,
                    secretKey,
                    baseUrl = "https://api.apispreadsheets.com",
                    bearerToken = null,
                    defaultHeaders = null,
                    timeout = 45
                } = {}) {
        this.baseUrl = (baseUrl || 'https://api.apispreadsheets.com').replace(/\/+$/, '');
        this.accessKey = accessKey || null;
        this.secretKey = secretKey || null;
        this.bearerToken = bearerToken || null;
        this.defaultHeaders = defaultHeaders || {};
        this.timeout = typeof timeout === 'number' ? timeout * 1000 : 45000; // ms
    }

    _buildHeaders(extra) {
        const h = Object.assign(
            { 'content-type': 'application/json' },
            this.defaultHeaders
        );
        if (this.accessKey != null && !('accessKey' in h)) h.accessKey = this.accessKey;
        if (this.secretKey != null && !('secretKey' in h)) h.secretKey = this.secretKey;
        if (this.bearerToken) h.Authorization = 'Bearer ' + this.bearerToken;
        if (extra) Object.assign(h, extra);
        return h;
    }

    _interpolatePath(pathTmpl, pathParams) {
        if (!pathParams) return pathTmpl;
        let p = pathTmpl;
        Object.keys(pathParams).forEach(k => {
            p = p.replace('{' + String(k) + '}', String(pathParams[k]));
        });
        return p;
    }

    _buildUrl(pathTmpl, pathParams, query) {
        const pathname = this._interpolatePath(pathTmpl, pathParams || {});
        const url = new URL(this.baseUrl + pathname);
        if (query) {
            Object.keys(query).forEach(k => {
                if (query[k] !== undefined && query[k] !== null) {
                    url.searchParams.append(k, String(query[k]));
                }
            });
        }
        return url.toString();
    }

    async _request(method, pathTmpl, { pathParams, query, headers, body } = {}) {
        const url = this._buildUrl(pathTmpl, pathParams, query);
        const h = this._buildHeaders(headers);

        let fetchBody = null;
        let contentType = h['content-type'] || h['Content-Type'];

        if (body !== undefined && body !== null) {
            if (contentType && contentType.indexOf('application/json') >= 0) {
                fetchBody = JSON.stringify(body);
            } else {
                // For multipart or custom bodies, pass as-is
                fetchBody = body;
            }
        }

        const res = await fetch(url, {
            method: method.toUpperCase(),
            headers: h,
            body: fetchBody,
            timeout: this.timeout // supported in node-fetch v2
        });

        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const isJson = ct.indexOf('application/json') >= 0;
        const payload = isJson ? await res.json() : await res.text();

        if (!res.ok) {
            throw new APIError(`${method.toUpperCase()} ${this._interpolatePath(pathTmpl, pathParams || {})} -> HTTP ${res.status}: ${isJson ? JSON.stringify(payload) : payload}`);
        }
        return payload;
    }

    // ---------- Endpoints (mirroring Python) ----------

    async runAgent({ agent_hash, temperature, top_p, file_ids, file_descriptions, body, accessKey, secretKey }) {
        if (!agent_hash) throw new APIError('Missing required path param: agent_hash');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            body = {};
            if (temperature != null) body.temperature = temperature;
            if (top_p != null) body.top_p = top_p;
            if (file_ids != null) body.file_ids = file_ids;
            if (file_descriptions != null) body.file_descriptions = file_descriptions;
        }

        return this._request('post', '/agents/{agent_hash}', {
            pathParams: { agent_hash },
            headers: hdrs,
            body
        });
    }

    async agentJobStatus({ job_hash, accessKey, secretKey, method = 'get' }) {
        if (!job_hash) throw new APIError('Missing required path param: job_hash');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak || !sk) throw new APIError('Missing required query params: accessKey and secretKey');

        method = String(method).toLowerCase();
        if (method !== 'get' && method !== 'post') throw new APIError("method must be 'get' or 'post'");

        return this._request(method, '/agents/jobs/{job_hash}', {
            pathParams: { job_hash },
            query: { accessKey: ak, secretKey: sk }
        });
    }

    async ai({ file_id, prompt, accessKey, secretKey, method = 'post', body = null }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        method = String(method).toLowerCase();
        if (method !== 'get' && method !== 'post') throw new APIError("method must be 'get' or 'post'");

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            if (prompt == null) throw new APIError('Missing required request body or prompt');
            body = { prompt };
        }

        return this._request(method, '/ai/{file_id}/', {
            pathParams: { file_id },
            headers: hdrs,
            body
        });
    }

    async calculate({ file_id, sheet_name, input_cells, output_cells, save_file_post_call, body, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            const payload = { input_cells: {}, output_cells: {} };

            if (input_cells != null) {
                if (typeof input_cells !== 'object' || Array.isArray(input_cells)) {
                    throw new APIError('input_cells must be a dict');
                }
                const values = Object.keys(input_cells).map(k => input_cells[k]);
                const isSingleSheet = values.every(v => {
                    const t = typeof v;
                    return v == null || t === 'string' || t === 'number' || t === 'boolean';
                });
                if (isSingleSheet) {
                    if (!sheet_name) throw new APIError('sheet_name is required when using shorthand input_cells');
                    payload.input_cells[sheet_name] = input_cells;
                } else {
                    payload.input_cells = input_cells;
                }
            }

            if (output_cells != null) {
                if (Array.isArray(output_cells)) {
                    if (!sheet_name) throw new APIError('sheet_name is required when using shorthand output_cells list');
                    payload.output_cells[sheet_name] = output_cells;
                } else if (typeof output_cells === 'object') {
                    payload.output_cells = output_cells;
                } else {
                    throw new APIError('output_cells must be a list or a dict');
                }
            }

            if (save_file_post_call != null) {
                if (typeof save_file_post_call !== 'boolean') throw new APIError('save_file_post_call must be a boolean');
                payload.save_file_post_call = save_file_post_call;
            }

            body = payload;
        }

        if (typeof body !== 'object' || Array.isArray(body)) {
            throw new APIError('body must be a dict');
        }
        if (!('input_cells' in body) || !('output_cells' in body)) {
            throw new APIError('body must include "input_cells" and "output_cells" keys');
        }

        return this._request('post', '/calculate/{file_id}/', {
            pathParams: { file_id },
            headers: hdrs,
            body
        });
    }

    async getCustomApi({ customapi_hash, body, accessKey, secretKey }) {
        if (!customapi_hash) throw new APIError('Missing required path param: customapi_hash');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak || !sk) throw new APIError('Missing required headers: accessKey and secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        return this._request('post', '/custom/details/{customapi_hash}', {
            pathParams: { customapi_hash },
            headers: hdrs,
            body: body || {}
        });
    }

    async runCustomApi({ customapi_id, body, headers }) {
        if (!customapi_id) throw new APIError('Missing required path param: customapi_id');

        const hdrs = Object.assign({}, headers || {});
        return this._request('post', '/custom/{customapi_id}', {
            pathParams: { customapi_id },
            headers: hdrs,
            body: body || {}
        });
    }

    async readData({ file_id, query, limit, count, dataFormat, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required query param: accessKey');
        if (!sk) throw new APIError('Missing required query param: secretKey');

        const q = {};
        if (query != null) q.query = query;
        if (limit != null) q.limit = limit;
        if (count != null) q.count = String(!!count).toLowerCase();
        if (dataFormat != null) q.dataFormat = dataFormat;
        q.accessKey = ak;
        q.secretKey = sk;

        return this._request('get', '/data/{file_id}/', {
            pathParams: { file_id },
            query: q
        });
    }

    async updateData({ file_id, body, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        if (!body || !body.data) throw new APIError('Update body must include "data" and "query" keys.');
        if (!('query' in body) || !body.query) throw new APIError('Update requires a "query" string to match rows.');

        return this._request('post', '/data/{file_id}/', {
            pathParams: { file_id },
            headers: { accessKey: ak, secretKey: sk },
            body
        });
    }

    async createData({ file_id, body, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        if (!body || !('data' in body)) throw new APIError('Request body must include "data" key, e.g. {"data": {...}}');

        return this._request('post', '/data/{file_id}/', {
            pathParams: { file_id },
            headers: { accessKey: ak, secretKey: sk },
            body
        });
    }

    async importFiles({ files, meta, accesskey, secretkey }) {
        if (!files || !files.length) throw new APIError('No files provided. Pass a list of file paths or file-like streams.');

        const ak = accesskey != null ? accesskey : this.accessKey;
        const sk = secretkey != null ? secretkey : this.secretKey;
        if (!ak || !sk) throw new APIError('Missing required headers: accesskey and secretkey');

        const form = new FormData();
        for (const item of files) {
            if (typeof item === 'string') {
                const fh = fs.createReadStream(item);
                const filename = path.basename(item);
                form.append('files', fh, filename);
            } else if (item && item.path) {
                // allow { path, filename?, contentType? }
                form.append('files', fs.createReadStream(item.path), item.filename || path.basename(item.path));
            } else if (item && item instanceof Buffer) {
                form.append('files', item, 'uploaded');
            } else if (item && item.read) {
                // generic readable stream
                form.append('files', item, item.path ? path.basename(item.path) : 'uploaded');
            } else if (Array.isArray(item) && (item.length === 2 || item.length === 3)) {
                // ["files", {custom tuple}] – keep parity with advanced Python usage
                form.append('files', item[1]);
            } else {
                throw new APIError('Unsupported file item; provide a path string or a readable stream/buffer.');
            }
        }

        if (meta != null) {
            if (typeof meta !== 'object' || Array.isArray(meta)) throw new APIError('meta must be a dict if provided');
            form.append('meta', JSON.stringify(meta));
        }

        // lowercase header names are fine
        const headers = Object.assign({}, form.getHeaders(), {
            accesskey: ak,
            secretkey: sk
        });

        const url = this.baseUrl + '/import';
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: form,
            timeout: this.timeout
        });

        const ct = (res.headers.get('content-type') || '').toLowerCase();
        const isJson = ct.indexOf('application/json') >= 0;
        const payload = isJson ? await res.json() : await res.text();

        if (!res.ok) {
            throw new APIError(`POST /import -> HTTP ${res.status}: ${isJson ? JSON.stringify(payload) : payload}`);
        }
        return payload;
    }

    async macros({ file_id, macros, macro_parameters, input_cells, output_cells, save_file_post_call, post_formula_actions, body, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            if (!macros) throw new APIError('`macros` is required when no raw `body` is provided');
            const payload = { macros };
            if (Array.isArray(macro_parameters)) payload.macro_parameters = macro_parameters.slice();
            if (input_cells && typeof input_cells === 'object') payload.input_cells = input_cells;
            if (output_cells && typeof output_cells === 'object') payload.output_cells = output_cells;
            if (save_file_post_call != null) {
                if (typeof save_file_post_call !== 'boolean') throw new APIError('save_file_post_call must be a boolean');
                payload.save_file_post_call = save_file_post_call;
            }
            if (post_formula_actions != null) payload.post_formula_actions = post_formula_actions;
            body = payload;
        }

        return this._request('post', '/macro/{file_id}/', {
            pathParams: { file_id },
            headers: hdrs,
            body
        });
    }

    async createFile({ data, fileName, body, accessKey, secretKey }) {
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            if (data == null) throw new APIError('Missing required body field: data');
            if (!fileName) throw new APIError('Missing required body field: fileName');
            body = { data, fileName };
        }

        return this._request('post', '/utilities/create', {
            headers: hdrs,
            body
        });
    }

    async downloadFile({ data, fileName, body, accessKey, secretKey }) {
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const hdrs = { accessKey: ak, secretKey: sk };
        if (!body) {
            if (data == null) throw new APIError('Missing required body field: data');
            if (!fileName) throw new APIError('Missing required body field: fileName');
            body = { data, fileName };
        }

        return this._request('post', '/utilities/download', {
            headers: hdrs,
            body
        });
    }

    async listFiles({ page, pageSize, q, sortBy, sortOrder, createdAfter, createdBefore, accessKey, secretKey }) {
        const hdrs = {};
        if (accessKey == null) throw new APIError('Missing required header param: accessKey');
        if (secretKey == null) throw new APIError('Missing required header param: secretKey');
        hdrs.accessKey = accessKey;
        hdrs.secretKey = secretKey;

        const query = {};
        if (page != null) query.page = page;
        if (pageSize != null) query.pageSize = pageSize;
        if (q != null) query.q = q;
        if (sortBy != null) query.sortBy = sortBy;
        if (sortOrder != null) query.sortOrder = sortOrder;
        if (createdAfter != null) query.createdAfter = createdAfter;
        if (createdBefore != null) query.createdBefore = createdBefore;

        return this._request('get', '/utilities/files', {
            headers: hdrs,
            query
        });
    }

    async getFile({ file_id, includeSamples, sampleRows, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const query = {};
        if (includeSamples != null) query.includeSamples = String(!!includeSamples).toLowerCase();
        if (sampleRows != null) query.sampleRows = sampleRows;

        return this._request('get', '/utilities/files/{file_id}', {
            pathParams: { file_id },
            headers: { accessKey: ak, secretKey: sk },
            query
        });
    }

    async updateFile({ file_id, name, description, sheetRead, body, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        if (!body) {
            body = {};
            if (name != null) body.name = name;
            if (description != null) body.description = description;
            if (sheetRead != null) body.sheetRead = sheetRead;
        }

        return this._request('post', '/utilities/files/{file_id}/', {
            pathParams: { file_id },
            query: { update: 'true' },
            headers: { accessKey: ak, secretKey: sk },
            body: body || {}
        });
    }

    async deleteFile({ file_id, accessKey, secretKey }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        return this._request('get', '/utilities/files/{file_id}', {
            pathParams: { file_id },
            query: { delete: 'true' },
            headers: { accessKey: ak, secretKey: sk }
        });
    }
    async runMacros({ file_id, input_cells, output_cells, sheet_name, save_file_post_call, accessKey, secretKey, body }) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        // This endpoint expects accessKey/secretKey IN THE BODY (per docs screenshot).
        // If `body` not provided, build it from convenience args.
        if (!body) {
            if (!input_cells || typeof input_cells !== 'object' || Array.isArray(input_cells)) {
                throw new APIError('input_cells (object) is required in body for runMacros');
            }
            if (save_file_post_call != null && typeof save_file_post_call !== 'boolean') {
                throw new APIError('save_file_post_call must be a boolean');
            }
            if (!accessKey) throw new APIError('Missing required body param: accessKey');
            if (!secretKey) throw new APIError('Missing required body param: secretKey');

            body = {
                accessKey,
                secretKey,
                input_cells,
            };
            if (sheet_name != null) body.sheet_name = sheet_name;
            if (Array.isArray(output_cells)) body.output_cells = output_cells;
            if (save_file_post_call != null) body.save_file_post_call = save_file_post_call;
        } else {
            // minimal validation if raw body supplied
            if (!body.accessKey) throw new APIError('Missing required body param: accessKey');
            if (!body.secretKey) throw new APIError('Missing required body param: secretKey');
            if (!body.input_cells || typeof body.input_cells !== 'object' || Array.isArray(body.input_cells)) {
                throw new APIError('body.input_cells must be an object');
            }
        }

        // Note: we send keys in BODY per docs. If your client was constructed with default keys,
        // they may also appear in headers (harmless). To avoid that, construct Client without defaults.
        return this._request('post', '/run-macros/{file_id}/', {
            pathParams: { file_id },
            headers: {}, // rely on JSON content-type from _build_headers
            body
        });
    }
    // Get OpenAPI spec for a file/test endpoint
    async getApiSpec({ file_id, is_test = false, accessKey, secretKey, headers } = {}) {
        if (!file_id) throw new APIError('Missing required path param: file_id');

        // prefer per-call keys, else client defaults
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;

        // If you intend to bypass auth (only for testing), pass is_test: true.
        if (!is_test) {
            if (!ak) throw new APIError('Missing required header param: accessKey');
            if (!sk) throw new APIError('Missing required header param: secretKey');
        }

        const hdrs = Object.assign(
            {},
            headers || {},
            ak ? { accessKey: ak } : {},
            sk ? { secretKey: sk } : {}
        );

        const body = { is_test: !!is_test };

        return this._request('post', '/spec/{file_id}', {
            pathParams: { file_id },
            headers: hdrs,
            body
        });
    }
    async buildAgent({ accessKey, secretKey, agentName, agentDescription, selectedFiles, fileDescriptions, selectedOutputFormats, agentInstructions, body } = {}) {
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        const allowed = ['.xlsx', '.pdf', '.html', '.docx', '.csv'];

        if (!body) {
            if (!agentName || !String(agentName).trim()) {
                throw new APIError('agentName is required');
            }
            if (!Array.isArray(selectedFiles) || selectedFiles.length === 0) {
                throw new APIError('selectedFiles must be a non-empty array of file ids');
            }
            if (selectedOutputFormats != null) {
                if (!Array.isArray(selectedOutputFormats)) {
                    throw new APIError('selectedOutputFormats must be an array');
                }
                const bad = selectedOutputFormats.filter(f => allowed.indexOf(f) === -1);
                if (bad.length) throw new APIError('Invalid output format(s): ' + bad.join(', '));
            }

            body = {
                agentName,
                agentDescription: agentDescription || '',
                selectedFiles,
                fileDescriptions: fileDescriptions || {},
                selectedOutputFormats: selectedOutputFormats || [],
                agentInstructions: agentInstructions || ''
            };
        } else {
            // minimal shape checks if raw body supplied
            if (!body.agentName) throw new APIError('agentName is required');
            if (!Array.isArray(body.selectedFiles) || !body.selectedFiles.length) {
                throw new APIError('selectedFiles must be a non-empty array of file ids');
            }
            if (Array.isArray(body.selectedOutputFormats)) {
                const bad = body.selectedOutputFormats.filter(f => allowed.indexOf(f) === -1);
                if (bad.length) throw new APIError('Invalid output format(s): ' + bad.join(', '));
            }
        }

        return this._request('post', '/build-agent/', {
            headers: { accessKey: ak, secretKey: sk },
            body
        });
    }
    async deleteCustomApi({ customapi_hash, accessKey, secretKey, body } = {}) {
        if (!customapi_hash) throw new APIError('Missing required path param: customapi_hash');

        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        return this._request('post', '/custom/delete/{customapi_hash}', {
            pathParams: { customapi_hash },
            headers: { accessKey: ak, secretKey: sk },
            body: body || {}
        });
    }
    async getCustomApis({ accessKey, secretKey, body } = {}) {
        const ak = accessKey != null ? accessKey : this.accessKey;
        const sk = secretKey != null ? secretKey : this.secretKey;
        if (!ak) throw new APIError('Missing required header param: accessKey');
        if (!sk) throw new APIError('Missing required header param: secretKey');

        return this._request('post', '/custom/list', {
            headers: { accessKey: ak, secretKey: sk },
            body: body || {}
        });
    }


}

module.exports = { APISpreadsheets, APIError };