const SHEET_NAMES = {
  kegiatan: 'Kegiatan',
  peserta: 'Peserta',
  materi: 'Materi',
  config: 'Config',
};

const HEADERS = {
  kegiatan: ['id', 'judulKegiatan', 'tempatPelaksanaan', 'tanggalMulai', 'tanggalBerakhir', 'ketuaPelaksana', 'generatedAt'],
  peserta: ['id', 'kegiatanId', 'name', 'number', 'role', 'predicate', 'institution', 'tempatLahir', 'tanggalLahir', 'date'],
  materi: ['id', 'kegiatanId', 'title', 'hours', 'instructor'],
  config: ['key', 'value'],
};

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  const result = action === 'load'
    ? { ok: true, payload: loadAll_() }
    : { ok: true, message: 'Database Sertifikat Ansor aktif.' };
  return respond_(result, e);
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    if (body.action !== 'saveAll') {
      throw new Error('Action tidak dikenal.');
    }
    saveAll_(body.payload || {});
    return respond_({
      ok: true,
      message: 'Database Google Sheets berhasil diperbarui.',
      savedAt: new Date().toISOString(),
    }, e);
  } catch (err) {
    return respond_({
      ok: false,
      message: err && err.message ? err.message : 'Gagal menyimpan database.',
    }, e);
  }
}

function respond_(result, e) {
  const callback = e && e.parameter && e.parameter.callback;
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function replaceRows_(sheetName, headers, rows) {
  const sheet = getSheet_(sheetName, headers);
  sheet.clearContents();
  const values = [headers].concat(rows);
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function saveAll_(payload) {
  const kegiatanList = payload.kegiatanList || [];
  const participants = payload.participants || [];
  const config = payload.config || {};

  replaceRows_(SHEET_NAMES.kegiatan, HEADERS.kegiatan, kegiatanList.map(function(k) {
    return [
      k.id || '',
      k.judulKegiatan || '',
      k.tempatPelaksanaan || '',
      k.tanggalMulai || '',
      k.tanggalBerakhir || '',
      k.ketuaPelaksana || '',
      k.generatedAt || '',
    ];
  }));

  replaceRows_(SHEET_NAMES.peserta, HEADERS.peserta, participants.map(function(p) {
    return [
      p.id || '',
      p.kegiatanId || '',
      p.name || '',
      p.number || '',
      p.role || '',
      p.predicate || '',
      p.institution || '',
      p.tempatLahir || '',
      p.tanggalLahir || '',
      p.date || '',
    ];
  }));

  const materiRows = [];
  kegiatanList.forEach(function(k) {
    (k.materi || []).forEach(function(m) {
      materiRows.push([
        m.id || '',
        k.id || '',
        m.title || '',
        m.hours || 0,
        m.instructor || '',
      ]);
    });
  });
  replaceRows_(SHEET_NAMES.materi, HEADERS.materi, materiRows);

  replaceRows_(SHEET_NAMES.config, HEADERS.config, [
    ['title', config.title || ''],
    ['eventName', config.eventName || ''],
    ['subEventName', config.subEventName || ''],
    ['location', config.location || ''],
    ['dateText', config.dateText || ''],
    ['issuedDateText', config.issuedDateText || ''],
    ['ketuaPelaksana', config.ketuaPelaksana || ''],
    ['selectedKegiatanId', payload.selectedKegiatanId || ''],
    ['syncedAt', payload.syncedAt || new Date().toISOString()],
    ['signeesJson', JSON.stringify(config.signees || [])],
  ]);
}

function rowsToObjects_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  return values
    .filter(function(row) {
      return row.some(function(cell) { return cell !== ''; });
    })
    .map(function(row) {
      const obj = {};
      headers.forEach(function(header, index) {
        obj[header] = row[index] || '';
      });
      return obj;
    });
}

function loadAll_() {
  const kegiatanRows = rowsToObjects_(SHEET_NAMES.kegiatan);
  const pesertaRows = rowsToObjects_(SHEET_NAMES.peserta);
  const materiRows = rowsToObjects_(SHEET_NAMES.materi);
  const configRows = rowsToObjects_(SHEET_NAMES.config);
  const configMap = {};

  configRows.forEach(function(row) {
    configMap[row.key] = row.value;
  });

  const kegiatanList = kegiatanRows.map(function(k) {
    return {
      id: k.id,
      judulKegiatan: k.judulKegiatan,
      tempatPelaksanaan: k.tempatPelaksanaan,
      tanggalMulai: k.tanggalMulai,
      tanggalBerakhir: k.tanggalBerakhir,
      ketuaPelaksana: k.ketuaPelaksana,
      generatedAt: k.generatedAt || undefined,
      materi: materiRows
        .filter(function(m) { return m.kegiatanId === k.id; })
        .map(function(m) {
          return {
            id: m.id,
            title: m.title,
            hours: Number(m.hours || 0),
            instructor: m.instructor || '',
          };
        }),
    };
  });

  let signees = [];
  try {
    signees = configMap.signeesJson ? JSON.parse(configMap.signeesJson) : [];
  } catch (err) {
    signees = [];
  }

  return {
    kegiatanList: kegiatanList,
    participants: pesertaRows.map(function(p) {
      return {
        id: p.id,
        kegiatanId: p.kegiatanId,
        name: p.name,
        number: p.number,
        role: p.role,
        predicate: p.predicate || undefined,
        institution: p.institution || undefined,
        tempatLahir: p.tempatLahir || undefined,
        tanggalLahir: p.tanggalLahir || undefined,
        date: p.date || undefined,
      };
    }),
    config: {
      title: configMap.title || 'SERTIFIKAT KADERISASI',
      eventName: configMap.eventName || 'Pelatihan Kepemimpinan Dasar (PKD)',
      subEventName: configMap.subEventName || '',
      location: configMap.location || '',
      dateText: configMap.dateText || '',
      issuedDateText: configMap.issuedDateText || undefined,
      ketuaPelaksana: configMap.ketuaPelaksana || undefined,
      materi: [],
      signees: signees,
    },
    selectedKegiatanId: configMap.selectedKegiatanId || (kegiatanList[0] && kegiatanList[0].id) || '',
    syncedAt: configMap.syncedAt || '',
  };
}
