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
        '<fonts count="3">' +
        '<font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="14"/><color rgb="FF1F4E79"/><name val="Calibri"/></font>' +
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
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
        '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
        '<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
        '</cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>';

    var ROOT_RELS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>';

    function utf8Bytes(str) {
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
        return out;
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

    function pushU16(a, v) { a.push(v & 0xFF, (v >>> 8) & 0xFF); }
    function pushU32(a, v) { a.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); }

    function zipStore(files) {
        var out = [], central = [], offset = 0, i, j;
        for (i = 0; i < files.length; i++) {
            var nameBytes = utf8Bytes(files[i].name);
            var data = files[i].bytes;
            var crc = crc32(data), sz = data.length;
            var localStart = out.length;
            pushU32(out, 0x04034b50); pushU16(out, 20); pushU16(out, 0); pushU16(out, 0);
            pushU16(out, 0); pushU16(out, 0x21);
            pushU32(out, crc); pushU32(out, sz); pushU32(out, sz);
            pushU16(out, nameBytes.length); pushU16(out, 0);
            for (j = 0; j < nameBytes.length; j++) out.push(nameBytes[j]);
            for (j = 0; j < data.length; j++) out.push(data[j]);

            pushU32(central, 0x02014b50); pushU16(central, 20); pushU16(central, 20); pushU16(central, 0); pushU16(central, 0);
            pushU16(central, 0); pushU16(central, 0x21);
            pushU32(central, crc); pushU32(central, sz); pushU32(central, sz);
            pushU16(central, nameBytes.length); pushU16(central, 0); pushU16(central, 0);
            pushU16(central, 0); pushU16(central, 0); pushU32(central, 0);
            pushU32(central, localStart);
            for (j = 0; j < nameBytes.length; j++) central.push(nameBytes[j]);
            offset = out.length;
        }
        var cdStart = out.length;
        for (j = 0; j < central.length; j++) out.push(central[j]);
        pushU32(out, 0x06054b50); pushU16(out, 0); pushU16(out, 0);
        pushU16(out, files.length); pushU16(out, files.length);
        pushU32(out, central.length); pushU32(out, cdStart); pushU16(out, 0);
        return new Uint8Array(out);
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

    function build(sheets) {
        var files = [];
        function add(name, str) { files.push({ name: name, bytes: utf8Bytes(str) }); }
        add('[Content_Types].xml', contentTypes(sheets.length));
        add('_rels/.rels', ROOT_RELS);
        add('xl/workbook.xml', workbookXml(sheets));
        add('xl/_rels/workbook.xml.rels', workbookRels(sheets.length));
        add('xl/styles.xml', STYLES_XML);
        for (var i = 0; i < sheets.length; i++) add('xl/worksheets/sheet' + (i + 1) + '.xml', sheetXml(sheets[i]));
        return zipStore(files);
    }

    function download(filename, sheets) {
        var data = build(sheets);
        var blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }

    var api = { S: STYLE, colName: colName, build: build, download: download };
    if (typeof window !== 'undefined') window.CBXLSX = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
