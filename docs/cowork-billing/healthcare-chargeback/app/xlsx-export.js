/* xlsx-export.js - dependency-free OOXML .xlsx writer (store-only ZIP). ES5, ASCII only.
   Exposes window.CBXLSX with { S, download, build }. Supports multiple sheets,
   inline strings, numbers, formulas, number formats, bold/header styles,
   frozen panes, column widths and autofilter. No external libraries. */
(function () {
    'use strict';

    // Style-name -> cellXfs index (see STYLES_XML below).
    var STYLE = { def: 0, bold: 1, cur: 2, pct: 3, int: 4, dec1: 5, boldCur: 6, boldInt: 7, hdr: 8, title: 9, rate: 10 };

    var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="5">' +
        '<numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>' +
        '<numFmt numFmtId="165" formatCode="0.0%"/>' +
        '<numFmt numFmtId="166" formatCode="#,##0"/>' +
        '<numFmt numFmtId="167" formatCode="#,##0.0"/>' +
        '<numFmt numFmtId="168" formatCode="&quot;$&quot;0.0000"/>' +
        '</numFmts>' +
        '<fonts count="4">' +
        '<font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Calibri"/></font>' +
        // fontId 3: header row. Explicit white, because the default theme colour
        // renders black on the dark blue header fill and is close to unreadable.
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
        '</fonts>' +
        '<fills count="3">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/><bgColor indexed="64"/></patternFill></fill>' +
        '</fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="11">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
        '<xf numFmtId="166" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>' +
        '<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
        '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '</cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>';

    var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';

    /* Byte handling is typed-array based on purpose. The original built a plain
       JS array one byte at a time and then copied it again inside the zip
       writer, which cost roughly 8 bytes of heap per output byte and threw
       "Invalid array length" on a real tenant: 200,000 users produced a Users
       sheet large enough to exceed the engine's array limits. */
    var ENC = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
    function utf8Bytes(str) {
        if (ENC) return ENC.encode(str);
        var out = [], i, c, c2, cp;
        for (i = 0; i < str.length; i++) {
            c = str.charCodeAt(i);
            if (c < 0x80) out.push(c);
            else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F)); }
            else if (c >= 0xD800 && c <= 0xDBFF) {
                c2 = str.charCodeAt(++i);
                cp = 0x10000 + ((c & 0x3FF) << 10) + (c2 & 0x3FF);
                out.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F), 0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
            } else { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
        }
        return new Uint8Array(out);
    }

    var CRC_TABLE = (function () {
        var t = [], n, k, c;
        for (n = 0; n < 256; n++) {
            c = n;
            for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            t[n] = c >>> 0;
        }
        return t;
    })();
    function crc32(bytes) {
        var c = 0xFFFFFFFF, i;
        for (i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    /* Two passes: size the output exactly, then fill it. Preallocating a single
       Uint8Array and using set() keeps peak memory at roughly the file size
       rather than a multiple of it, and removes the array-length ceiling. */
    /* Writes the zip. Each entry carries its own method so a deflated payload
       and a stored one can sit in the same archive. crc and uncompressed size
       always describe the original bytes, per the spec. */
    function zipWrite(files) {
        var i, n = files.length;
        var names = [], total = 0, cdSize = 0;
        for (i = 0; i < n; i++) {
            names.push(utf8Bytes(files[i].name));
            if (!files[i].out) { files[i].out = files[i].bytes; files[i].method = 0; }
            files[i].crc = crc32(files[i].bytes);
            total += 30 + names[i].length + files[i].out.length;
            cdSize += 46 + names[i].length;
        }
        var buf = new Uint8Array(total + cdSize + 22);
        var dv = new DataView(buf.buffer);
        var p = 0, offsets = [];

        function u16(v) { dv.setUint16(p, v, true); p += 2; }
        function u32(v) { dv.setUint32(p, v, true); p += 4; }

        for (i = 0; i < n; i++) {
            offsets.push(p);
            var f = files[i];
            u32(0x04034b50); u16(20); u16(0); u16(f.method); u16(0); u16(0x21);
            u32(f.crc); u32(f.out.length); u32(f.bytes.length);
            u16(names[i].length); u16(0);
            buf.set(names[i], p); p += names[i].length;
            buf.set(f.out, p); p += f.out.length;
        }
        var cdStart = p;
        for (i = 0; i < n; i++) {
            u32(0x02014b50); u16(20); u16(20); u16(0); u16(files[i].method); u16(0); u16(0x21);
            u32(files[i].crc); u32(files[i].out.length); u32(files[i].bytes.length);
            u16(names[i].length); u16(0); u16(0); u16(0); u16(0); u32(0);
            u32(offsets[i]);
            buf.set(names[i], p); p += names[i].length;
        }
        var cdEnd = p;
        /* Capture the size before writing the record. The u16/u32 helpers
           advance p, so evaluating (p - cdStart) inline would measure the EOCD
           header itself into the central directory size. */
        var cdBytes = cdEnd - cdStart;
        u32(0x06054b50); u16(0); u16(0); u16(n); u16(n);
        u32(cdBytes); u32(cdStart); u16(0);
        return buf;
    }

    /* Spreadsheet XML compresses roughly fifteen to one, which is the
       difference between a workbook you can email and one you cannot. A real
       tenant produced a 48 MB stored archive. CompressionStream is async and
       not universal, so deflation is best-effort and the writer falls back to
       storing when it is unavailable. */
    function deflateAll(files) {
        if (typeof CompressionStream === 'undefined' || typeof Response === 'undefined') {
            return Promise.resolve(files);
        }
        return Promise.all(files.map(function (f) {
            try {
                var cs = new CompressionStream('deflate-raw');
                var s = new Response(f.bytes).body.pipeThrough(cs);
                return new Response(s).arrayBuffer().then(function (ab) {
                    var z = new Uint8Array(ab);
                    // only take it if it actually helped
                    if (z.length < f.bytes.length) { f.out = z; f.method = 8; }
                    else { f.out = f.bytes; f.method = 0; }
                    return f;
                }).catch(function () { f.out = f.bytes; f.method = 0; return f; });
            } catch (e) {
                f.out = f.bytes; f.method = 0;
                return Promise.resolve(f);
            }
        }));
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function colName(n) {
        var s = '';
        while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }
    function styleIndex(s) { return (typeof s === 'string') ? (STYLE[s] || 0) : (s || 0); }

    function normCell(c) {
        if (c == null) return { t: 's', v: '', s: 0 };
        if (typeof c === 'number') return { t: 'n', v: c, s: 0 };
        if (typeof c === 'string') return { t: 's', v: c, s: 0 };
        var s = styleIndex(c.s);
        if (c.f != null) return { t: 'f', f: c.f, s: s };
        if (c.t === 'n' || (c.t == null && typeof c.v === 'number')) return { t: 'n', v: c.v, s: s };
        return { t: 's', v: c.v, s: s };
    }
    function cellXml(addr, c) {
        if (c.t === 'f') return '<c r="' + addr + '" s="' + c.s + '"><f>' + esc(c.f) + '</f></c>';
        if (c.t === 'n') return '<c r="' + addr + '" s="' + c.s + '"><v>' + c.v + '</v></c>';
        return '<c r="' + addr + '" s="' + c.s + '" t="inlineStr"><is><t xml:space="preserve">' + esc(c.v) + '</t></is></c>';
    }

    function sheetXml(sheet) {
        var rowsXml = '', r, ci;
        for (r = 0; r < sheet.rows.length; r++) {
            var row = sheet.rows[r] || [], cells = '';
            for (ci = 0; ci < row.length; ci++) {
                var c = normCell(row[ci]);
                if (c.t === 's' && c.v === '' && c.s === 0) continue;
                cells += cellXml(colName(ci + 1) + (r + 1), c);
            }
            rowsXml += '<row r="' + (r + 1) + '">' + cells + '</row>';
        }
        var colsXml = '';
        if (sheet.cols && sheet.cols.length) {
            colsXml = '<cols>';
            for (var i = 0; i < sheet.cols.length; i++) colsXml += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + sheet.cols[i] + '" customWidth="1"/>';
            colsXml += '</cols>';
        }
        var pane = sheet.freeze ? '<pane ySplit="' + sheet.freeze + '" topLeftCell="A' + (sheet.freeze + 1) + '" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>' : '';
        var af = sheet.autofilter ? '<autoFilter ref="' + sheet.autofilter + '"/>' : '';
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
            '<sheetViews><sheetView workbookViewId="0">' + pane + '</sheetView></sheetViews>' +
            '<sheetFormatPr defaultRowHeight="15"/>' + colsXml + '<sheetData>' + rowsXml + '</sheetData>' + af + '</worksheet>';
    }

    function contentTypes(n) {
        var s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
            '<Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
        for (var i = 0; i < n; i++) s += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
        return s + '</Types>';
    }
    function workbookXml(sheets) {
        var s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
        for (var i = 0; i < sheets.length; i++) s += '<sheet name="' + esc(sheets[i].name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
        return s + '</sheets></workbook>';
    }
    function workbookRels(n) {
        var s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
        for (var i = 0; i < n; i++) s += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
        s += '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
        return s + '</Relationships>';
    }

    function collect(sheets) {
        var files = [];
        function add(name, str) { files.push({ name: name, bytes: utf8Bytes(str) }); }
        add('[Content_Types].xml', contentTypes(sheets.length));
        add('_rels/.rels', ROOT_RELS);
        add('xl/workbook.xml', workbookXml(sheets));
        add('xl/_rels/workbook.xml.rels', workbookRels(sheets.length));
        add('xl/styles.xml', STYLES_XML);
        for (var i = 0; i < sheets.length; i++) add('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sheets[i]));
        return files;
    }
    /* Synchronous, stored. Kept so callers and tests that want bytes now still
       work; download() prefers the compressed path. */
    function build(sheets) { return zipWrite(collect(sheets)); }
    function buildAsync(sheets) {
        return deflateAll(collect(sheets)).then(zipWrite);
    }

    function download(filename, sheets) {
        function emit(data) {
            var blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 0);
        }
        try {
            return buildAsync(sheets).then(emit).catch(function () { emit(build(sheets)); });
        } catch (e) {
            emit(build(sheets));
        }
    }

    var api = { S: STYLE, colName: colName, build: build, buildAsync: buildAsync, download: download };
    if (typeof window !== 'undefined') window.CBXLSX = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
