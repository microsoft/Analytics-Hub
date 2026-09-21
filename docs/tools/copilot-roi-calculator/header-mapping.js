// Header normalization for Viva Insights / Super User Adoption CSV exports.
// Mirrors the Power Query M code shipped with the Super User Adoption Power BI template
// (Adoption M Code - CSV.txt → HeaderMap_BritishToAmerican + HeaderMap_SpanishToEnglish + Copilot365/DesInfo aliases).
//
// Source of truth: C:\Studio proj\Super Usage Updates\Adoption M Code - CSV.txt
// Browsers reading a CSV via FileReader.readAsText() default to UTF-8 so Spanish accents
// (ó í ñ ú á é ü) arrive intact. We also build an ACCENT-STRIPPED LOWER-CASED secondary
// lookup so the same map keeps working when a customer hands us a file that was double-
// encoded (cp1252 mojibake like "Ã³" instead of "ó") or that uses inconsistent casing.

(function (root) {
    'use strict';

    // ---- en-GB → en-US ----
    // Verbatim from HeaderMap_BritishToAmerican in the M code.
    var UK_TO_US = {
        'Summarise email thread actions taken using Copilot in Outlook': 'Summarize email thread actions taken using Copilot in Outlook',
        'Summarise meeting actions taken using Copilot in Teams': 'Summarize meeting actions taken using Copilot in Teams',
        'Summarise presentation actions taken using Copilot in PowerPoint': 'Summarize presentation actions taken using Copilot in PowerPoint',
        'Summarise Word document actions taken using Copilot in Word': 'Summarize Word document actions taken using Copilot in Word',
        'Summarise chat actions taken using Copilot in Teams': 'Summarize chat actions taken using Copilot in Teams',
        'Total chat conversations summarised by Copilot in Teams': 'Total chat conversations summarized by Copilot in Teams',
        'Meeting hours summarised by Copilot in Teams': 'Meeting hours summarized by Copilot in Teams',
        'Organise presentation actions taken': 'Organize presentation actions taken',
        'Organisation': 'Organization',
        'Copilot actions taken in Copilot Chat (work)': 'Copilot actions taken in Copilot chat (work)',
        'Copilot Chat (work) prompts submitted': 'Copilot chat (work) prompts submitted',
        'Days of active Copilot usage in PowerPoint': 'Days of active Copilot usage in Powerpoint',
        'Visualise as table actions taken using Copilot in Word': 'Visualize as table actions taken using Copilot in Word',
        'Total meetings summarised by Copilot in Teams': 'Total meetings summarized by Copilot in Teams',
        'Copilot actions taken in PowerPoint': 'Copilot actions taken in Powerpoint'
    };

    // ---- es → en-US ----
    // Verbatim from HeaderMap_SpanishToEnglish. Spanish keys use the proper Unicode characters
    // (ó, í, ñ, ú, á, etc.) because the source CSVs are UTF-8.
    var ES_TO_EN = {
        'Horas de llamadas fuera del horario laboral': 'After-hours call hours',
        'Horas de mensajes del canal fuera del horario laboral': 'After-hours channel message hours',
        'Horas de chat fuera del horario laboral': 'After-hours chat hours',
        'Horas de colaboración fuera del horario laboral': 'After-hours collaboration hours',
        'Horas de correo electrónico fuera del horario laboral': 'After-hours email hours',
        'Horas de reuniones fuera del horario laboral': 'After-hours meeting hours',
        'Horas de llamadas programadas fuera del horario laboral': 'After-hours scheduled call hours',
        'Horas de llamadas no programadas fuera del horario laboral': 'After-hours unscheduled call hours',
        'Horas activas conectadas': 'Active connected hours',
        'Reuniones atendidas': 'Attended meetings',
        'Horas de llamadas': 'Call hours',
        'Llamadas': 'Calls',
        'Horas de mensajes del canal': 'Channel message hours',
        'Publicaciones de mensajes del canal': 'Channel message posts',
        'Reacciones de mensajes del canal': 'Channel message reactions',
        'Respuestas de mensajes del canal': 'Channel message replies',
        'Visitas del canal': 'Channel visits',
        'Horas de chat': 'Chat hours',
        'Chats enviados': 'Chats sent',
        'Horas de colaboración': 'Collaboration hours',
        'Intervalo de colaboración': 'Collaboration span',
        'Horas de correo electrónico': 'Email hours',
        'Correos electrónicos enviados': 'Emails sent',
        'Horas de reuniones y llamadas': 'Meeting and call hours',
        'Horas de reuniones': 'Meeting hours',
        'Reuniones': 'Meetings',
        'Horas de multitarea': 'Multitasking hours',
        'Horas de llamadas programadas': 'Scheduled call hours',
        'Tiempo con los directivos': 'Time with leadership',
        'Horas de llamadas no programadas': 'Unscheduled call hours',
        'Horas de correo electrónico urgentes': 'Urgent email hours',
        'Horas de reuniones urgentes': 'Urgent meeting hours',
        'Relaciones diferentes': 'Diverse ties',
        'Tamaño de la red externa': 'External network size',
        'Tamaño de la red interna': 'Internal network size',
        'Relaciones solidas': 'Strong ties',
        'Agregar contenido a las acciones de presentación realizadas': 'Add content to presentation actions taken',
        'Indicaciones de chat (Copilot en Excel) enviadas': 'Chat (Copilot in Excel) prompts submitted',
        'Indicaciones de chat (Copilot en PowerPoint) enviadas': 'Chat (Copilot in PowerPoint) prompts submitted',
        'Indicaciones de chat (Copilot en Word) enviadas': 'Chat (Copilot in Word) prompts submitted',
        'Acciones de redacción de mensajes de chat realizadas usando Copilot en Teams': 'Compose chat message actions taken using Copilot in Teams',
        'Acciones de Copilot realizadas en Copilot Chat (trabajo)': 'Copilot actions taken in Copilot chat (work)',
        'Acciones de Copilot realizadas en Excel': 'Copilot actions taken in Excel',
        'Acciones de Copilot realizadas en Outlook': 'Copilot actions taken in Outlook',
        'Acciones de Copilot realizadas en PowerPoint': 'Copilot actions taken in Powerpoint',
        'Acciones de Copilot realizadas en Teams': 'Copilot actions taken in Teams',
        'Acciones de Copilot realizadas en Word': 'Copilot actions taken in Word',
        'Horas asistidas por Copilot': 'Copilot assisted hours',
        'Indicaciones de Copilot Chat (web) enviadas a Excel': 'Copilot Chat (web) in Excel prompts submitted',
        'Indicaciones de Copilot Chat (web) enviadas a PowerPoint': 'Copilot Chat (web) in PowerPoint prompts submitted',
        'Indicaciones de Copilot Chat (web) enviadas a Word': 'Copilot Chat (web) in Word prompts submitted',
        'Indicaciones de Copilot Chat (web) enviadas': 'Copilot Chat (web) prompts submitted',
        'Indicaciones de Copilot Chat (Web) enviadas en Outlook': 'Copilot Chat (Web) prompts submitted in Outlook',
        'Indicaciones de Copilot Chat (web) enviadas en Teams': 'Copilot Chat (Web) prompts submitted in Teams',
        'Días habilitados para Copilot Chat (trabajo)': 'Copilot chat (work) enabled days',
        'Indicaciones de Copilot Chat (trabajo) enviadas a Excel': 'Copilot Chat (work) in Excel prompts submitted',
        'Indicaciones de Copilot Chat (trabajo) enviadas a PowerPoint': 'Copilot Chat (work) in PowerPoint prompts submitted',
        'Indicaciones de Copilot Chat (trabajo) enviadas a Word': 'Copilot Chat (work) in Word prompts submitted',
        'Indicaciones de Copilot Chat (trabajo) enviadas': 'Copilot chat (work) prompts submitted',
        'Indicaciones de Copilot Chat (trabajo) enviadas en Outlook': 'Copilot Chat (work) prompts submitted in Outlook',
        'Indicaciones de Copilot Chat (trabajo) enviadas en Teams': 'Copilot Chat (work) prompts submitted in Teams',
        'Días habilitados para Copilot para la búsqueda inteligente': 'Copilot enabled days for Intelligent Search',
        'Días habilitados para Copilot para conectores de Power Platform': 'Copilot enabled days for Power Platform connectors',
        'Días habilitados para Copilot para la aplicación de productividad': 'Copilot enabled days for Productivity App',
        'Días habilitados para Copilot para Teams': 'Copilot enabled days for Teams',
        'Acciones de creación de fórmulas de Excel realizadas con Copilot': 'Create Excel formula actions taken using Copilot',
        'Acciones de creación de presentación realizadas con Copilot': 'Create presentation actions taken using Copilot',
        'Días de uso activo de Copilot Chat (web)': 'Days of active Copilot Chat (web) usage',
        'Días de uso activo de Copilot Chat (trabajo)': 'Days of active Copilot chat (work) usage',
        'Días de uso activo de Copilot en Excel': 'Days of active Copilot usage in Excel',
        'Días de uso activo de Copilot en Loop': 'Days of active Copilot usage in Loop',
        'Días de uso activo de Copilot en OneNote': 'Days of active Copilot usage in OneNote',
        'Días de uso activo de Copilot en Outlook': 'Days of active Copilot usage in Outlook',
        'Días de uso activo de Copilot en PowerPoint': 'Days of active Copilot usage in Powerpoint',
        'Días de uso activo de Copilot en Teams': 'Days of active Copilot usage in Teams',
        'Días de uso activo de Copilot en Word': 'Days of active Copilot usage in Word',
        'Borrador de acciones de documento de Word realizadas usando Copilot': 'Draft Word document actions taken using Copilot',
        'Acciones de entrenamiento por correo electrónico realizadas con Copilot': 'Email coaching actions taken using Copilot',
        'Acciones de análisis de Excel realizadas con Copilot': 'Excel analysis actions taken using Copilot',
        'Acciones de formato de Excel realizadas con Copilot': 'Excel formatting actions taken using Copilot',
        'Acciones de generación de borrador de correo electrónico realizadas con Copilot en Outlook': 'Generate email draft actions taken using Copilot in Outlook',
        'Acciones de resumen inteligentes realizadas': 'Intelligent recap actions taken',
        'Horas de reunión resumidas por Copilot': 'Meeting hours recapped by Copilot',
        'Horas de reunión resumidas por Copilot en Teams': 'Meeting hours summarized by Copilot in Teams',
        'Reuniones resumidas por Copilot': 'Meetings recapped by Copilot',
        'Organizar las acciones de presentación realizadas': 'Organize presentation actions taken',
        'Reescritura de acciones de texto realizadas con Copilot en Word': 'Rewrite text actions taken using Copilot in Word',
        'Acciones de resumen de chat realizadas con Copilot en Teams': 'Summarize chat actions taken using Copilot in Teams',
        'Acciones de resumen de hilo de correo realizadas con Copilot en Outlook': 'Summarize email thread actions taken using Copilot in Outlook',
        'Acciones de resumen de reunión realizadas con Copilot en Teams': 'Summarize meeting actions taken using Copilot in Teams',
        'Acciones de resumen de presentación realizadas con Copilot en PowerPoint': 'Summarize presentation actions taken using Copilot in PowerPoint',
        'Acciones de resumen de documento de Word realizadas con Copilot en Word': 'Summarize Word document actions taken using Copilot in Word',
        'Total de conversaciones de chat resumidas por Copilot en Teams': 'Total chat conversations summarized by Copilot in Teams',
        'Total de acciones de Copilot realizadas': 'Total Copilot actions taken',
        'Total de días activos de Copilot': 'Total Copilot active days',
        'Total de días habilitados para Copilot': 'Total Copilot enabled days',
        'Total de correos electrónicos enviados con Copilot en Outlook': 'Total emails sent using Copilot in Outlook',
        'Total de horas de reuniones resumidas por Copilot': 'Total Meeting hours summarized or recapped by Copilot',
        'Total de reuniones resumidas por Copilot en Teams': 'Total meetings summarized by Copilot in Teams',
        'Total de reuniones resumidas por Copilot': 'Total meetings summarized or recapped by Copilot',
        'Visualizar como acciones de tabla realizadas con Copilot en Word': 'Visualize as table actions taken using Copilot in Word',
        'Horas de colaboración externa': 'External collaboration hours',
        'Horas disponibles para concentrarse': 'Available-to-focus hours',
        'Horas interrumpidas': 'Interrupted hours',
        'Abrir bloque de 1 hora': 'Open 1-Hour Block',
        'Horas ininterrumpidas': 'Uninterrupted hours',
        // Customer-specific demographic aliases used by Microsoft's reference template
        'Copilot365': 'FunctionType',
        'DesInfo': 'Organization'
    };

    // Loose key: strip diacritics, collapse whitespace, lower-case.
    // Lets us also tolerate mojibake'd inputs (where "ó" was double-encoded as "Ã³")
    // by first un-mojibake-ing common cp1252→UTF-8 corruption.
    function unMojibake(s) {
        // Reverse the cp1252-misread-as-UTF8 patterns we see in real-world exports.
        return String(s || '')
            .replace(/Ã³/g, 'ó').replace(/Ã­/g, 'í').replace(/Ã±/g, 'ñ')
            .replace(/Ãº/g, 'ú').replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é')
            .replace(/Ã¼/g, 'ü').replace(/Ã/g, 'í'); // standalone Ã often means í lost its tail
    }

    function looseKey(s) {
        return String(s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip combining diacritics
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // Build the loose-key index once
    var LOOSE_INDEX = {};
    function addLoose(key, value) {
        LOOSE_INDEX[looseKey(key)] = value;
    }
    Object.keys(UK_TO_US).forEach(function (k) { addLoose(k, UK_TO_US[k]); });
    Object.keys(ES_TO_EN).forEach(function (k) { addLoose(k, ES_TO_EN[k]); });

    // normalizeHeader(header) → canonical en-US header (or original if no match)
    function normalizeHeader(h) {
        var raw = String(h || '').trim().replace(/^"|"$/g, '');
        if (UK_TO_US[raw]) return UK_TO_US[raw];
        if (ES_TO_EN[raw]) return ES_TO_EN[raw];
        // Try un-mojibake'd
        var un = unMojibake(raw);
        if (UK_TO_US[un]) return UK_TO_US[un];
        if (ES_TO_EN[un]) return ES_TO_EN[un];
        // Try diacritic-stripped lower-case
        var loose = looseKey(un);
        if (LOOSE_INDEX[loose]) return LOOSE_INDEX[loose];
        return raw;
    }

    // normalizeHeaders(array) → new array with each header normalized
    function normalizeHeaders(headers) {
        return headers.map(normalizeHeader);
    }

    // Returns the locale detected from the un-normalized header row, for telemetry/UI.
    function detectLocale(originalHeaders) {
        var es = 0, uk = 0;
        for (var i = 0; i < originalHeaders.length; i++) {
            var raw = String(originalHeaders[i] || '').trim().replace(/^"|"$/g, '');
            var un = unMojibake(raw);
            if (ES_TO_EN[raw] || ES_TO_EN[un]) es++;
            if (UK_TO_US[raw] || UK_TO_US[un]) uk++;
        }
        if (es >= 3) return 'es';
        if (uk >= 2) return 'en-GB';
        return 'en-US';
    }

    root.HeaderMapping = {
        UK_TO_US: UK_TO_US,
        ES_TO_EN: ES_TO_EN,
        normalizeHeader: normalizeHeader,
        normalizeHeaders: normalizeHeaders,
        detectLocale: detectLocale,
        unMojibake: unMojibake,
        looseKey: looseKey
    };
})(typeof window !== 'undefined' ? window : globalThis);
