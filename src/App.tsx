import axios from "axios";
import * as React from "react";

interface ImageData {
  f1: string;
  f2: string;
  f3: number;
  f4: number;
  f5: string;
  f6: number;
  f7: string;
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
  "500-100",
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
    { index: number; status: string }[]
  >([]); // Report state

  const BASE_URL = "BASE_URL";

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

  async function onLogin() {
    setIsLoading(true);
    setStatusText("Sedang login...");

    const body = {
      email: "EMAIL",
      password: "PASSWORD",
    };

    try {
      const response = await axios.post(`${BASE_URL}auth/login`, body);
      if (response.status === 200) {
        const TOKEN = response.data.data.token;
        setStatusText("Login sukses.");
        await processImages(TOKEN); // Call upload function after login
      } else {
        setStatusText("Login gagal.");
      }
    } catch (error) {
      setStatusText("Login gagal. Periksa koneksi.");
    } finally {
      setIsLoading(false); // Set loading state to false in all cases
    }
  }

  async function processImages(token: string) {
    if (!data || images.length === 0) {
      alert("Tidak ada data untuk diproses atau gambar yang diupload.");
      return;
    }

    const tempReport: { index: number; status: string }[] = []; // Temporary report for processing

    for (const [index, item] of data.entries()) {
      const imageFileName = item.f7; // File name from f7
      const imageFile = images.find((img) => img.name === imageFileName); // Find matching image

      if (imageFile) {
        const formData = new FormData();
        formData.append("files", imageFile);

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

          console.log("UPLOAD", uploadResponse);

          if (uploadResponse.status === 200) {
            console.log(`Gambar ${imageFileName} berhasil di-upload.`);
            const success = await createData(
              token,
              uploadResponse.data.data,
              item,
              imageFile
            );
            tempReport.push({
              index: index + 1,
              status: success ? "SUKSES" : "GAGAL",
            }); // Log success or failure based on createData
          } else {
            console.error(`Gagal meng-upload gambar ${imageFileName}.`);
            tempReport.push({ index: index + 1, status: "GAGAL" }); // Log failure
          }
        } catch (error) {
          console.error(
            `Error saat meng-upload gambar ${imageFileName}:`,
            error
          );
          tempReport.push({ index: index + 1, status: "GAGAL" }); // Log failure
        }
      } else {
        console.warn(
          `Gambar ${imageFileName} tidak ditemukan dalam state images.`
        );
        tempReport.push({ index: index + 1, status: "GAGAL" }); // Log failure
      }
    }

    setReport(tempReport); // Set the report state
    downloadReport(tempReport); // Download report after processing
  }

  async function createData(
    token: string,
    imageResult: any,
    data: ImageData,
    imageFile: File
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
        originalDocumentation: [
          {
            filename: imageFile.name, // Use image file name
            size: imageFile.size, // Get size from File object
          },
        ],
        documentation: imageResult,
      };

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

      console.log("CREATE DATA", response);

      if (response.status === 200) {
        console.log("Data berhasil dibuat:", response.data);
        setStatusText("Data berhasil dibuat.");
        return true; // Indicate success
      } else {
        console.error("Gagal membuat data:", response.data);
        setStatusText("Gagal membuat data.");
        return false; // Indicate failure
      }
    } catch (error) {
      console.error("Error saat membuat data:", error);
      setStatusText("Error saat membuat data.");
      return false; // Indicate failure
    }
  }

  const downloadReport = (reportData: { index: number; status: string }[]) => {
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

  return (
    <div className="bg-slate-900 mx-auto min-h-screen flex items-center justify-center">
      <div className="max-w-screen-sm flex flex-col justify-center gap-4">
        <div>
          <p>Pilih file JSON</p>
          <input
            type="file"
            accept=".json" // Only accept JSON files
            className="file-input file-input-sm file-input-bordered w-full max-w-xs"
            onChange={handleJsonChange}
          />
        </div>

        <div>
          <p>Pilih bahan gambar</p>
          <input
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
      </div>
    </div>
  );
}

export default App;
