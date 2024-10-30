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

const _KEGIATAN_DATA_LABEL = [
  "Pemasangan atribut (spanduk, poster, stiker, dll)",
  "Canvassing atau door-to-door",
  "Kegiatan keagamaan",
  "Konsolidasi relawan",
  "Diskusi Publik",
  "Panggung terbuka",
  "Pawai",
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

const _JUMLAH_MASA_LABEL = [
  "<10",
  "11-50",
  "50-100",
  "101-300",
  "301-500",
  "500-1000",
  "1000-5000",
  ">5000",
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

  const [mode, setMode] = React.useState<"INPUT" | "GENERATE">("INPUT");
  const [showType, setShowType] = React.useState<"INPUT" | "SHOW">("INPUT");

  const [genData, setGenData] = React.useState<any>([]);
  const [genObj, setGenObj] = React.useState<ImageData>({
    f1: "",
    f2: "",
    f3: 0,
    f4: 1,
    f5: "",
    f6: 0,
    f7: [""],
  });
  const [inputType, setInputType] = React.useState<"ADD" | "EDIT">("ADD");
  const [selectedIndex, setSelectedIndex] = React.useState<any>();

  const handleOpenModal = () => {
    logModalRef.current?.showModal(); // Gunakan ref untuk membuka modal
  };

  const BASE_URL = "";
  // ,7gEf6KrbC78

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
      email: "",
      password: "",
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
        <button
          className="btn btn-sm bg-orange-500 text-white"
          onClick={() => setMode("GENERATE")}
        >
          Buat Config Data
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

  console.log("DATA", genObj);

  function renderGenerateConfig() {
    function RenderBox({
      pt,
      tip,
      onClick,
      active,
    }: {
      pt: number;
      tip: string;
      onClick: any;
      active: boolean;
    }) {
      return (
        <div
          onClick={onClick}
          data-tip={tip}
          className={` tooltip w-8 h-8 ${
            active ? " bg-blue-500" : "bg-gray-700"
          } cursor-pointer hover:bg-gray-500 rounded-md flex justify-center items-center`}
        >
          <div>{pt}</div>
        </div>
      );
    }

    function RenderCard({
      data,
      onEdit,
      onDelete,
    }: {
      data: any;
      onEdit: any;
      onDelete: any;
    }) {
      return (
        <div className="bg-slate-600 flex flex-col gap-2 p-4 rounded-md">
          <span>{data.f1}</span>
          <span>{data.f2}</span>
          <div className="flex flex-row gap-4 mt-2">
            <button className="btn btn-xs" onClick={onEdit}>
              Edit
            </button>
            <button className="btn btn-xs" onClick={onDelete}>
              Hapus
            </button>
          </div>
        </div>
      );
    }

    function handleInput(e: any, key: any) {
      const value = e.target.value;

      if (key == "f7") {
        setGenObj({ ...genObj, [key]: [value] });
      } else {
        setGenObj({ ...genObj, [key]: value });
      }
    }

    const handleDelete = (index: number) => {
      setGenData((prevData: any) =>
        prevData.filter((_: any, i: number) => i !== index)
      );
    };

    const handleEdit = (index: number, newData: any) => {
      setGenData((prevData: any) =>
        prevData.map((item: any, i: number) =>
          i === index ? { ...item, ...newData } : item
        )
      );
    };

    const handleDownloadJSON = () => {
      // Convert the genData array to a JSON string
      const jsonData = JSON.stringify(genData, null, 2);

      // Create a Blob from the JSON string
      const blob = new Blob([jsonData], { type: "application/json" });

      // Create a download link and click it programmatically
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "DATA.json";
      link.click();

      // Clean up the URL object after download
      URL.revokeObjectURL(link.href);
    };

    return (
      <div className="max-w-screen-sm flex flex-col justify-center">
        {showType == "INPUT" ? (
          <div className=" flex flex-col gap-2.5">
            <button
              onClick={() => {
                setMode("INPUT");
                setGenData([]);
              }}
              className="btn btn-lg text-lg btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <label className="form-control max-w-sm">
              <div className="label">
                <span className="label-text">Penanggung Jawab</span>
              </div>
              <input
                type="text"
                placeholder="Penanggung Jawab"
                className="input input-sm input-bordered max-w-sm"
                value={genObj.f1}
                onChange={(e) => handleInput(e, "f1")}
              />
            </label>
            <label className="form-control max-w-sm">
              <div className="label">
                <span className="label-text">Nama Elemen</span>
              </div>
              <input
                type="text"
                placeholder="Nama Elemen"
                className="input input-sm input-bordered max-w-sm"
                value={genObj.f2}
                onChange={(e) => handleInput(e, "f2")}
              />
            </label>
            <div>
              <div className="label">
                <span className="label-text">Jenis Kegiatan</span>
              </div>
              <div className="flex flex-row gap-2">
                {_KEGIATAN_DATA_LABEL.map((item, index) => {
                  return (
                    <RenderBox
                      onClick={() => {
                        setGenObj({ ...genObj, f3: index + 1 });
                      }}
                      active={genObj.f3 == index + 1}
                      tip={item}
                      pt={index + 1}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <div className="label">
                <span className="label-text">Kab/Kota</span>
              </div>
              <div className="flex flex-row gap-2">
                <RenderBox
                  onClick={() => {
                    setGenObj({ ...genObj, f4: 1 });
                  }}
                  active={genObj.f4 == 1}
                  tip={"PURBALINGGA"}
                  pt={1}
                />
              </div>
            </div>
            <label className="form-control max-w-sm">
              <div className="label">
                <span className="label-text">Tempat Kegiatan</span>
              </div>
              <input
                type="text"
                placeholder="Tempat Kegiatan"
                className="input input-sm input-bordered max-w-sm"
                value={genObj.f5}
                onChange={(e) => handleInput(e, "f5")}
              />
            </label>
            <div>
              <div className="label">
                <span className="label-text">Jumlah Masa</span>
              </div>
              <div className="flex flex-row gap-2">
                {_JUMLAH_MASA_LABEL.map((item, index) => {
                  return (
                    <RenderBox
                      onClick={() => {
                        setGenObj({ ...genObj, f6: index + 1 });
                      }}
                      active={genObj.f6 == index + 1}
                      tip={item}
                      pt={index + 1}
                    />
                  );
                })}
              </div>
            </div>
            <label className="form-control max-w-sm">
              <div className="label">
                <span className="label-text">
                  Nama File ( Beserta ekstensi )
                </span>
              </div>
              <input
                type="text"
                placeholder="Nama File ( cth: P1.jpg )"
                className="input input-sm input-bordered max-w-sm"
                value={genObj.f7[0]}
                onChange={(e) => handleInput(e, "f7")}
              />
            </label>
            <div className=" flex flex-col gap-4">
              <button
                className="btn btn-sm w-full bg-primary text-white mt-8"
                onClick={() => {
                  if (inputType == "ADD") {
                    setGenData([...genData, genObj]);
                    setGenObj({
                      f1: "",
                      f2: "",
                      f3: 0,
                      f4: 1,
                      f5: "",
                      f6: 0,
                      f7: [""],
                    });
                  } else {
                    setInputType("ADD");
                    handleEdit(selectedIndex, genObj);
                    setGenObj({
                      f1: "",
                      f2: "",
                      f3: 0,
                      f4: 1,
                      f5: "",
                      f6: 0,
                      f7: [""],
                    });
                  }
                }}
              >
                {inputType == "ADD" ? "Tambah Data" : "Simpan Perubahan"}
              </button>
              <button
                className="btn btn-sm w-full bg-secondary text-white"
                onClick={() => setShowType("SHOW")}
              >
                Lihat Data ({genData.length})
              </button>
            </div>
          </div>
        ) : (
          <div className=" flex flex-col gap-2.5 max-h-screen">
            <button
              onClick={() => setShowType("INPUT")}
              className="btn btn-lg text-lg btn-circle btn-ghost absolute right-2 top-2"
            >
              ✕
            </button>
            <div className=" flex flex-col w-full">
              <div className="flex flex-row items-center gap-4">
                <h2>
                  {genData.length > 0 ? "Data Ditambahkan" : "Belum Ada Data"}
                </h2>
                {genData.length > 0 && (
                  <button
                    onClick={handleDownloadJSON}
                    className="btn btn-sm btn-primary"
                  >
                    Buat DATA.json
                  </button>
                )}
              </div>

              <div className=" flex flex-col gap-2 overflow-y-auto">
                {genData.map((item: any, index: number) => {
                  return (
                    <RenderCard
                      data={item}
                      onEdit={() => {
                        setGenObj(item);
                        setShowType("INPUT");
                        setSelectedIndex(index);
                        setInputType("EDIT");
                      }}
                      onDelete={() => handleDelete(index)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMain(): React.ReactNode {
    if (mode == "INPUT") {
      return renderUnlocked();
    } else {
      return renderGenerateConfig();
    }
  }

  return (
    <div className="bg-slate-900 mx-auto min-h-screen flex items-center justify-center">
      {renderMain()}
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
