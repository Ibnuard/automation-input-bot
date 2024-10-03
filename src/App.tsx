import axios from "axios";
import moment from "moment";
import * as React from "react";

interface ImageData {
  f1: string;
  f2: string;
  f3: number;
  f4: number;
  f5: string;
  f6: number;
  f7: string[]; // f7 is now an array of image filenames
}

interface UploadResponse {
  data: {
    data: any; // Adjust according to the structure you receive from API
  };
  status: number;
}

interface CreateDataResponse {
  data: {
    message: string; // Adjust according to the structure you receive from API
  };
  status: number;
}

interface ReportData {
  index: string;
  status: string;
}

const _KEGIATAN_DATA = [
  "ATTRIBUTE_INSTALLATION",
  "CANVASSING",
  "RELIGIOUS",
  "CONSOLIDATION",
  "PUBLIC_DISCUSSION",
  "OPEN_STAGE",
  "PARADE",
];

const _JUMLAH_MASA = [
  "0-10",
  "11-50",
  "50-100",
  "101-300",
  "301-500",
  "500-1000",
  "1001-5000",
  "5001",
];

const _PROV = ["PURBALINGGA"];

function App() {
  const [data, setData] = React.useState<ImageData[] | null>(null);
  const [images, setImages] = React.useState<File[]>([]); // Store selected image files
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [statusText, setStatusText] = React.useState<string>("");
  const [report, setReport] = React.useState<
    { index: string; status: string; reason?: string }[]
  >([]); // Report state
  const [log, setLog] = React.useState<string[]>([]);
  const [code, setCode] = React.useState<string>("");
  const [isUnlocked, setIsUnlocked] = React.useState<boolean>(false);

  const jsonInputRef = React.useRef<HTMLInputElement | null>(null); // Ref for JSON input
  const imageInputRef = React.useRef<HTMLInputElement | null>(null); // Ref for Image input

  const logModalRef = React.useRef<HTMLDialogElement>(null); // Gunakan ref untuk modal

  const handleOpenModal = () => {
    logModalRef.current?.showModal(); // Gunakan ref untuk membuka modal
  };

  const BASE_URL = "BASE_URL";

  function isDisabled() {
    if (images.length > 0) {
      return false;
    }

    return true;
  }

  const handleJsonChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const jsonData = JSON.parse(reader.result as string);
          setData(jsonData); // Set JSON data to state
        } catch (error) {
          alert("Gagal memproses file JSON.");
        }
      };
      reader.readAsText(file);
    } else {
      alert("Silakan pilih file JSON yang valid.");
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setImages(Array.from(files)); // Store selected images in state
    }
  };

  const checkImagesSync = () => {
    if (!data || images.length === 0) {
      alert("Data JSON atau gambar belum dipilih.");
      return false;
    }

    // Periksa setiap item di data
    for (const item of data) {
      for (const imageFileName of item.f7) {
        const imageExists = images.some((img) => img.name === imageFileName);

        // Jika ada gambar di f7 yang tidak ditemukan di images
        if (!imageExists) {
          alert(
            `Gambar ${imageFileName} tidak ditemukan di gambar yang dipilih.`
          );
          return false;
        }
      }
    }

    // Jika semua gambar di f7 ada di images
    return true;
  };

  async function onLogin() {
    const isSynced = checkImagesSync();
    if (!isSynced) return; // Jika tidak sinkron, hentikan eksekusi

    setIsLoading(true);
    setStatusText("Sedang login...");
    setLog((prev) => [...prev, "system login"]);

    const body = {
      email: "EMAIL",
      password: "PASSWORD",
    };

    try {
      const response = await axios.post(`${BASE_URL}auth/login`, body);
      if (response.status === 200) {
        const TOKEN = response.data.data.token;
        setStatusText("Login sukses.");
        setLog((prev) => [...prev, "login sukses"]);
        await processImages(TOKEN); // Call upload function after login
      } else {
        setLog((prev) => [...prev, "login gagal"]);
        setStatusText("Login gagal.");
      }
    } catch (error) {
      setLog((prev) => [...prev, "login gagal. Periksa koneksi."]);
      setStatusText("Login gagal. Periksa koneksi.");
      console.log(error);
    } finally {
      setIsLoading(false); // Set loading state to false in all cases
    }
  }

  async function processImages(token: string) {
    setLog((prev) => [...prev, "memproses gambar"]);
    if (!data || images.length === 0) {
      alert("Tidak ada data untuk diproses atau gambar yang diupload.");
      return;
    }

    const tempReport: { index: string; status: string; reason?: string }[] = []; // Temporary report for processing

    for (const [index, item] of data.entries()) {
      const imageFileNames = item.f7; // f7 is an array of image filenames

      for (const [imageIndex, imageFileName] of imageFileNames.entries()) {
        const imageFile = images.find((img) => img.name === imageFileName); // Find matching image by name

        if (imageFile) {
          const formData = new FormData();
          formData.append("files", imageFile);

          setLog((prev) => [...prev, `mengupload gambar ${imageFileName}`]);

          try {
            const uploadResponse: UploadResponse = await axios.post(
              `${BASE_URL}api/v1/activity-report/upload`,
              formData,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            if (uploadResponse.status === 200) {
              console.log(`Gambar ${imageFileName} berhasil di-upload.`);
              setLog((prev) => [
                ...prev,
                `gambar ${imageFileName} berhasil di-upload.`,
              ]);

              // Create one data record for each image
              const success = await createData(
                token,
                [uploadResponse.data.data[0]],
                item,
                [imageFileName]
              );
              tempReport.push({
                index: `${index + 1}-${imageIndex + 1}`, // Make the index more descriptive
                status: success ? "SUKSES" : "GAGAL",
                reason: statusText,
              });
            } else {
              console.error(`Gagal meng-upload gambar ${imageFileName}.`);
              setLog((prev) => [
                ...prev,
                `gambar ${imageFileName} gagal di-upload.`,
              ]);
              tempReport.push({
                index: `${index + 1}-${imageIndex + 1}`,
                status: "GAGAL",
              });
            }
          } catch (error) {
            console.error(
              `error saat meng-upload gambar ${imageFileName}:`,
              error
            );
            setLog((prev) => [
              ...prev,
              `error saat meng-upload gambar ${imageFileName}: ${error}`,
            ]);
            tempReport.push({
              index: `${index + 1}-${imageIndex + 1}`,
              status: "GAGAL",
            });
          }
        } else {
          console.warn(
            `Gambar ${imageFileName} tidak ditemukan dalam state images.`
          );
          setLog((prev) => [
            ...prev,
            `gambar ${imageFileName} tidak ditemukan dalam state images.`,
          ]);
          tempReport.push({
            index: `${index + 1}-${imageIndex + 1}`,
            status: "GAGAL",
          });
        }
      }
    }

    setData([]);
    setImages([]);
    setReport(tempReport); // Set the report state
    downloadReport(tempReport); // Download report after processing

    if (jsonInputRef.current) jsonInputRef.current.value = ""; // Clear JSON input
    if (imageInputRef.current) imageInputRef.current.value = ""; // Clear image input
  }

  async function createData(
    token: string,
    imageResults: any[],
    data: ImageData,
    imageFileNames: string[]
  ): Promise<boolean> {
    try {
      const body = {
        pic: data.f1,
        elementName: data.f2,
        type: _KEGIATAN_DATA[data.f3 - 1],
        province: "JAWA TENGAH",
        regency: _PROV[data.f4 - 1],
        place: data.f5,
        numberOfPeople: _JUMLAH_MASA[data.f6 - 1],
        originalDocumentation: imageFileNames.map((fileName) => ({
          filename: fileName,
          size: images.find((img) => img.name === fileName)?.size || 0, // Find size from File object
        })),
        documentation: imageResults, // Use the result of image uploads
      };

      console.log("BODY", body);

      const response: CreateDataResponse = await axios.put(
        `${BASE_URL}api/v1/activity-report/create`,
        body,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setLog((prev) => [...prev, `membuat data`]);

      if (response.status === 200) {
        console.log("Data berhasil dibuat:", response.data);
        setStatusText("Data berhasil dibuat.");
        setLog((prev) => [...prev, `data berhasil dibuat`]);
        return true; // Indicate success
      } else {
        console.error("Gagal membuat data:", response.data);
        setStatusText("Gagal membuat data.");
        setLog((prev) => [...prev, `gagal membuat data.`]);
        return false; // Indicate failure
      }
    } catch (error) {
      console.error("Error saat membuat data:", error);
      setStatusText("Error saat membuat data.");
      setLog((prev) => [...prev, `error saat membuat data.`]);
      return false; // Indicate failure
    }
  }

  const downloadReport = (reportData: { index: string; status: string }[]) => {
    const blob = new Blob([JSON.stringify({ data: reportData }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.json"; // Specify the file name for the download
    document.body.appendChild(a);
    a.click(); // Trigger the download
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the URL object
  };

  function getTotalSuksesGagal(report: ReportData[]) {
    let totalSukses = 0;
    let totalGagal = 0;

    report.forEach((item) => {
      if (item.status === "SUKSES") {
        totalSukses++;
      } else if (item.status === "GAGAL") {
        totalGagal++;
      }
    });

    return {
      totalSukses,
      totalGagal,
    };
  }

  React.useEffect(() => {
    const cekLS = localStorage.getItem("UNLOCKED");
    if (cekLS) {
      if (cekLS == "1") {
        setIsUnlocked(true);
        console.log("app unlocked");
      } else {
        setIsUnlocked(false);
        console.log("app locked");
      }
    } else {
      setIsUnlocked(false);
      console.log("app locked");
    }
  }, []);

  function onCodeSubmit() {
    // Dapatkan tanggal hari ini dalam format yang mudah untuk dibandingkan (misalnya "YYYY-MM-DD")
    const todayString = moment().format("YYYY-MM-DD");

    // Tentukan tanggal valid untuk kode TRIAL
    const validDate = "2024-10-03"; // Ganti ini dengan tanggal valid (YYYY-MM-DD)
    const validDate2 = "2024-10-04";

    // Cek apakah kode adalah "TRIAL" dan tanggal bukan hari ini
    if (code === "TRIAL") {
      if (todayString !== validDate) {
        alert(`Kode tidak berlaku. ${todayString}`);
      } else {
        setIsUnlocked(true);
        console.log("Kode TRIAL valid dan digunakan pada hari ini.");
      }
    } else if (code === "TRIAL2") {
      if (todayString !== validDate2) {
        alert(`Kode tidak berlaku. ${todayString}`);
      } else {
        setIsUnlocked(true);
        console.log("Kode TRIAL valid dan digunakan pada hari ini.");
      }
    } else if (code == "UNLOCK") {
      setIsUnlocked(true);
      localStorage.setItem("UNLOCKED", "1");
    } else {
      alert("Kode salah.");
    }
  }

  function renderUnlocked() {
    return (
      <div className="max-w-screen-sm flex flex-col justify-center gap-4">
        <div>
          <p>Pilih file JSON</p>
          <input
            type="file"
            ref={jsonInputRef}
            accept=".json" // Only accept JSON files
            className="file-input file-input-sm file-input-bordered w-full max-w-xs"
            onChange={handleJsonChange}
          />
        </div>

        <div>
          <p>Pilih bahan gambar</p>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*" // Accept all image types
            multiple // Allow multiple files to be selected
            className="file-input file-input-sm file-input-bordered w-full max-w-xs"
            onChange={handleImageChange}
          />
        </div>

        <button
          className="btn btn-sm btn-primary text-white mt-8"
          disabled={isLoading}
          onClick={onLogin}
        >
          {isLoading ? (
            <span className="loading loading-dots loading-xs text-white"></span>
          ) : (
            "Proses Data"
          )}
        </button>
        {isLoading && (
          <div className="flex flex-col items-center">
            <p className="text-white font-semibold m-0">Status: </p>
            <p className="text-white m-0 text-sm">{statusText}</p>
          </div>
        )}

        {report.length > 0 && (
          <div className="flex flex-col items-center gap-4 mt-4">
            <p className="text-white font-semibold m-0">Hasil :</p>
            <div className=" flex flex-row gap-2">
              <div className="btn btn-sm hover:bg-emerald-500 bg-emerald-500 text-white">
                Sukses : {getTotalSuksesGagal(report).totalSukses}
              </div>
              <div className="btn btn-sm hover:bg-red-500 bg-red-500 text-white">
                Gagal : {getTotalSuksesGagal(report).totalGagal}
              </div>
              <div
                onClick={() => {
                  setReport([]);
                  setLog([]);
                }}
                className="btn btn-sm hover:bg-blue-500 bg-blue-500 text-white"
              >
                Bersihkan Report
              </div>
            </div>
            <div
              onClick={handleOpenModal}
              className="text-white btn btn-primary btn-sm w-[90%]"
            >
              Tampilkan Log
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderLocked() {
    return (
      <div className="max-w-screen-sm flex flex-col justify-center items-center gap-4">
        <input
          type="text"
          placeholder="Masukan Kode"
          className="input input-sm input-bordered w-full max-w-xs"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          disabled={!code}
          className="btn btn-sm w-full btn-primary text-white"
          onClick={onCodeSubmit}
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 mx-auto min-h-screen flex items-center justify-center">
      {isUnlocked ? renderUnlocked() : renderLocked()}
      <dialog id="log_modal" ref={logModalRef} className="modal">
        <div className="modal-box">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
              ✕
            </button>
          </form>
          <h3 className="font-bold text-lg">Log</h3>
          <ul>
            {log.map((item) => {
              return <li className=" text-sm mt-2">{item}</li>;
            })}
          </ul>
        </div>
      </dialog>
    </div>
  );
}

export default App;
