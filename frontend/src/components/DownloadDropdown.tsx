import React, { useState } from "react";
import axios from "axios";
import { TranscriptionItem } from "../common/types";

interface DownloadDropdownProps {
  transcriptionData: TranscriptionItem[] | null;
}

const DownloadDropdown: React.FC<DownloadDropdownProps> = ({
  transcriptionData,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<string>("");

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFormat(e.target.value);
  };

  const handleDownload = () => {
    if (selectedFormat) {
      // Create a new FormData instance
      const formData = new FormData();
      formData.append("data", JSON.stringify(transcriptionData));
      formData.append("format", selectedFormat);

      // Make a POST request to the Django backend API
      axios
        .post(
          "http://localhost:8000/backend/transcription_webapp/download/",
          formData
        )
        .then((response) => {
          // Handle the response from the Django backend API
          // For this example, we will assume the response contains the file URL
          const fileUrl = response.data.fileUrl;
          // Trigger file download by creating an <a> element and clicking it programmatically
          const link = document.createElement("a");
          link.href = fileUrl;
          link.download = `transcription.${selectedFormat}`;
          link.click();
        })
        .catch((error) => {
          // Handle any errors that occur during the request
          console.error(error);
        });
    }
  };

  return (
    <div>
      <select
        value={selectedFormat}
        onChange={handleFormatChange}
        className="mr-2 py-2 px-4 bg-gray-200 text-gray-700 rounded"
      >
        <option value="">Select Format</option>
        <option value="csv">CSV</option>
        <option value="txt">TXT</option>
        <option value="srt">SRT</option>
        <option value="vtt">VTT</option>
      </select>
      <button
        onClick={handleDownload}
        className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded"
        disabled={!selectedFormat}
      >
        Download
      </button>
    </div>
  );
};

export default DownloadDropdown;
