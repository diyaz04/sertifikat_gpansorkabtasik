import React, { useState, memo } from 'react';
import * as XLSX from 'xlsx';
import { Participant } from '../types';
import { 
  FileSpreadsheet, 
  HelpCircle, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Database,
  Check,
  ChevronDown,
  Download,
  Upload
} from 'lucide-react';

interface GoogleSheetsImporterProps {
  onImportComplete: (participants: Participant[]) => void;
  currentParticipantsCount: number;
}

function GoogleSheetsImporter({ onImportComplete, currentParticipantsCount }: GoogleSheetsImporterProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // States for mapping after fetch
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    name: '',
    institution: '',
    tempatLahir: '',
    tanggalLahir: '',
  });

  const [showGuide, setShowGuide] = useState(false);
  const templateHeaders = ['Nama', 'Tempat Lahir', 'Tanggal Lahir', 'Utusan Peserta'];

  const detectColumnMapping = (fileHeaders: string[]) => {
    const detectMapping = {
      name: '',
      institution: '',
      tempatLahir: '',
      tanggalLahir: '',
    };

    fileHeaders.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('nama') || lower.includes('peserta') || lower.includes('kader') || lower === 'name') {
        detectMapping.name = header;
      } else if (lower.includes('pac') || lower.includes('kecamatan') || lower.includes('utusan') || lower.includes('instansi') || lower.includes('asal')) {
        detectMapping.institution = header;
      } else if (lower.includes('tempat') || lower.includes('lahir_tempat') || lower.includes('birthplace') || lower.includes('tplahir')) {
        detectMapping.tempatLahir = header;
      } else if (lower.includes('tanggal') || lower.includes('tgl') || lower.includes('lahir_tanggal') || lower.includes('birthdate') || lower.includes('tglahir')) {
        detectMapping.tanggalLahir = header;
      }
    });

    if (!detectMapping.name && fileHeaders.length > 0) detectMapping.name = fileHeaders[0];
    return detectMapping;
  };

  const applyParsedRows = (parsedRows: string[][], sourceName: string) => {
    const cleanedRows = parsedRows
      .map(row => row.map(cell => String(cell ?? '').trim()))
      .filter(row => row.length > 0 && row.some(cell => cell !== ''));

    if (cleanedRows.length === 0) {
      throw new Error('File kosong atau tidak memiliki baris data yang valid.');
    }

    const fileHeaders = cleanedRows[0].filter(Boolean);
    if (fileHeaders.length === 0) {
      throw new Error('Baris pertama harus berisi judul kolom.');
    }

    setHeaders(fileHeaders);
    setRawData(cleanedRows.slice(1));
    setMapping(detectColumnMapping(fileHeaders));
    setSuccess(`Berhasil memuat ${sourceName}! Ditemukan ${fileHeaders.length} kolom dan ${cleanedRows.length - 1} baris data. Silakan cek pemetaan kolom di bawah.`);
  };

  // Helper to extract sheet ID
  const extractSheetId = (url: string): string | null => {
    const regExp = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const matches = url.match(regExp);
    return matches ? matches[1] : null;
  };

  // Robust CSV Parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // Skip double-quote escape
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        lines.push(row);
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      lines.push(row);
    }
    
    return lines.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  };

  const handleDownloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const pesertaRows = [
      templateHeaders,
      ['SAHABAT MUHAMMAD RAFIQ', 'Tasikmalaya', '2001-07-10', 'PAC Karangjaya'],
      ['SAHABAT DIAN HERDIANSYAH', 'Garut', '1999-03-21', 'PAC Singaparna'],
    ];
    const pesertaSheet = XLSX.utils.aoa_to_sheet(pesertaRows);
    pesertaSheet['!cols'] = [
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(workbook, pesertaSheet, 'Data Peserta');

    const guideSheet = XLSX.utils.aoa_to_sheet([
      ['Panduan Pengisian Template'],
      ['1. Jangan mengubah nama kolom pada baris pertama.'],
      ['2. Satu baris untuk satu peserta.'],
      ['3. Format tanggal lahir paling aman: YYYY-MM-DD, contoh 2001-07-10.'],
      ['4. Kolom Nama wajib diisi. Kolom lain boleh kosong jika belum tersedia.'],
      ['5. Nomor sertifikat tidak perlu diisi karena dibuat otomatis oleh aplikasi.'],
    ]);
    guideSheet['!cols'] = [{ wch: 90 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Panduan');

    const file = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Import_Peserta_Sertifikat_Ansor.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExcelUpload = async (file: File) => {
    setError(null);
    setSuccess(null);
    setHeaders([]);
    setRawData([]);
    setIsLoading(true);

    try {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        applyParsedRows(parseCSV(text), file.name);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('File Excel tidak memiliki sheet.');
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
          raw: false,
          defval: '',
        });
        applyParsedRows(rows, file.name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal membaca file Excel. Pastikan memakai template import yang disediakan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setHeaders([]);
    setRawData([]);

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      setError('Format URL Google Sheets tidak valid. Pastikan URL berisi "/spreadsheets/d/ID_LEMBAR_KERJA"');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch as public CSV
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(csvUrl);
      
      if (!response.ok) {
        throw new Error('Gagal mengakses Google Sheets. Pastikan dokumen diatur ke "Siapa saja yang memiliki link dapat melihat".');
      }

      const csvText = await response.text();
      const parsedRows = parseCSV(csvText);

      if (parsedRows.length === 0) {
        throw new Error('Dokumen kosong atau tidak memiliki baris data yang valid.');
      }

      applyParsedRows(parsedRows, 'data Google Sheets');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menarik data dari Google Sheets. Silakan periksa koneksi internet dan pengaturan akses dokumen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyImport = () => {
    if (!mapping.name) {
      setError('Kolom "Nama" wajib dipilih untuk melakukan pemetaan data.');
      return;
    }

    const nameIndex = headers.indexOf(mapping.name);
    const institutionIndex = mapping.institution ? headers.indexOf(mapping.institution) : -1;
    const tempatLahirIndex = mapping.tempatLahir ? headers.indexOf(mapping.tempatLahir) : -1;
    const tanggalLahirIndex = mapping.tanggalLahir ? headers.indexOf(mapping.tanggalLahir) : -1;

    const importedParticipants: Participant[] = rawData
      .filter(row => row[nameIndex] && row[nameIndex].trim() !== '')
      .map((row, idx) => {
      // Fallback certificate number generation if empty
      const fallbackNum = `${currentParticipantsCount + idx + 1}/PC-XVII/01/${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][new Date().getMonth()]}/${new Date().getFullYear()}`;
      
      return {
        id: `import_${Date.now()}_${idx}`,
        kegiatanId: '', // Diisi di App.tsx
        name: row[nameIndex] || 'Kader Tanpa Nama',
        number: fallbackNum,
        role: 'Peserta',
        institution: institutionIndex !== -1 && row[institutionIndex] ? row[institutionIndex] : undefined,
        tempatLahir: tempatLahirIndex !== -1 && row[tempatLahirIndex] ? row[tempatLahirIndex] : undefined,
        tanggalLahir: tanggalLahirIndex !== -1 && row[tanggalLahirIndex] ? row[tanggalLahirIndex] : undefined,
      };
    });

    if (importedParticipants.length === 0) {
      setError('Tidak ada baris peserta yang memiliki Nama. Isi kolom Nama terlebih dahulu.');
      return;
    }

    onImportComplete(importedParticipants);
    setSheetUrl('');
    setHeaders([]);
    setRawData([]);
    setSuccess(`Sukses memasukkan ${importedParticipants.length} data peserta ke daftar generator!`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#ebfef4] rounded-xl text-[#006633]">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Import Data Peserta</h2>
            <p className="text-xs text-slate-500">Upload Excel template atau tarik dari Google Sheets</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadTemplate}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#006633] hover:text-[#005229] bg-[#ebfef4] hover:bg-[#ebfef4]/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={() => setShowGuide(!showGuide)}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            {showGuide ? 'Sembunyikan Panduan' : 'Panduan'}
          </button>
        </div>
      </div>

      {showGuide && (
        <div className="mb-6 p-4 bg-[#ebfef4]/50 rounded-xl border border-[#006633]/20 text-xs text-[#006633] space-y-2 leading-relaxed">
          <p className="font-bold text-sm text-[#006633] mb-1">💡 Cara Menghubungkan Google Sheets:</p>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>Buka file Google Sheets berisi daftar nama kader GP Ansor Anda.</li>
            <li>Pastikan baris pertama berisi Judul Kolom: <strong>Nama</strong>, <strong>Tempat Lahir</strong>, <strong>Tanggal Lahir</strong>, dan <strong>Utusan Peserta</strong>.</li>
            <li>Klik tombol <strong className="bg-[#ebfef4] px-1 py-0.5 rounded text-[#006633]">Bagikan (Share)</strong> di sudut kanan atas Google Sheets.</li>
            <li>Di bawah bagian <i>"Akses umum"</i>, ubah "Dibatasi" menjadi <strong className="text-[#006633] font-bold">"Siapa saja yang memiliki link dapat melihat" (Anyone with link can view)</strong>.</li>
            <li>Salin link dokumen dari kotak alamat browser Anda, lalu tempelkan (paste) di kolom input di bawah ini.</li>
          </ol>
        </div>
      )}

      {/* Excel Upload */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-[#006633]/20 bg-[#ebfef4]/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#006633]">
            <Download className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wide">Template Excel</span>
          </div>
          <p className="text-xs text-[#006633]/80 leading-relaxed">
            Gunakan template agar kolom otomatis terbaca: Nama, Tempat Lahir, Tanggal Lahir, dan Utusan Peserta.
          </p>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-1.5 bg-[#006633] hover:bg-[#005229] text-white text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
        </div>

        <label className="border border-dashed border-slate-300 hover:border-[#006633] bg-slate-50 hover:bg-[#ebfef4]/20 rounded-xl p-4 flex flex-col justify-center gap-2 cursor-pointer transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleExcelUpload(file);
              e.currentTarget.value = '';
            }}
          />
          <div className="flex items-center gap-2 text-slate-800">
            <Upload className="w-4 h-4 text-[#006633]" />
            <span className="text-xs font-black uppercase tracking-wide">Upload File Excel</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Terima file .xlsx, .xls, atau .csv. Setelah terbaca, cek pemetaan kolom lalu klik Terapkan & Impor.
          </p>
        </label>
      </div>

      {/* Google Sheets URL Form */}
      <form onSubmit={handleFetchData} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            URL Link Google Sheets
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/xxxxxx/edit?usp=sharing"
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#006633]/20 focus:border-[#006633]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-[#006633] hover:bg-[#005229] text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              {isLoading ? 'Menarik...' : 'Tarik Data'}
            </button>
          </div>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3.5 bg-[#ebfef4] border border-[#006633]/20 text-[#006633] rounded-xl flex items-start gap-3 text-xs leading-relaxed">
          <CheckCircle className="w-4 h-4 text-[#006633] shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      {/* Column Mapping Configuration */}
      {headers.length > 0 && (
        <div className="mt-6 p-5 border border-[#006633]/20 bg-[#ebfef4]/10 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Pemetaan Kolom Data Import</h3>
            <p className="text-xs text-slate-500 mt-0.5">Nomor sertifikat dan status peserta akan dibuat otomatis oleh aplikasi</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name Selector (Required) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Nama Kader <span className="text-rose-500">*</span></label>
              <div className="relative">
                <select
                  value={mapping.name}
                  onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 appearance-none text-slate-800 font-medium focus:outline-none focus:border-[#006633]"
                >
                  <option value="">-- Pilih Kolom Nama --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Institution / PAC */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Utusan Peserta</label>
              <div className="relative">
                <select
                  value={mapping.institution}
                  onChange={(e) => setMapping({ ...mapping, institution: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 appearance-none text-slate-800 font-medium focus:outline-none focus:border-[#006633]"
                >
                  <option value="">-- Tanpa Utusan --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Tempat Lahir */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Tempat Lahir</label>
              <div className="relative">
                <select
                  value={mapping.tempatLahir}
                  onChange={(e) => setMapping({ ...mapping, tempatLahir: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 appearance-none text-slate-800 font-medium focus:outline-none focus:border-[#006633]"
                >
                  <option value="">-- Tanpa Tempat Lahir --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">Tanggal Lahir</label>
              <div className="relative">
                <select
                  value={mapping.tanggalLahir}
                  onChange={(e) => setMapping({ ...mapping, tanggalLahir: e.target.value })}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 appearance-none text-slate-800 font-medium focus:outline-none focus:border-[#006633]"
                >
                  <option value="">-- Tanpa Tanggal Lahir --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleApplyImport}
              type="button"
              className="flex items-center gap-2 bg-[#006633] hover:bg-[#005229] text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Terapkan & Impor ({rawData.length} Kader)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(GoogleSheetsImporter);
