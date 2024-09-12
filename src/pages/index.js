import { useState } from 'react';
import "../app/globals.css";

export default function Home() {
  const [url1, setUrl1] = useState('');
  const [url2, setUrl2] = useState('');
  const [pages, setPages] = useState(['']); // State to handle multiple pages
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch('/api/compare-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url1, url2, pages }), // Include pages in the request body
      });

      const data = await response.json();
      console.log('Response from server:', data); // Debugging

      if (response.ok) {
        setResult(data);
        setError(null);
      } else {
        setResult(null);
        setError(data.message);
      }
    } catch (error) {
      setResult(null);
      setError(error.message);
    }
  };

  const handleClear = () => {
    setUrl1('');
    setUrl2('');
    setPages(['']); // Reset pages
    setResult(null);
    setError(null);
  };

  const handlePageChange = (index, event) => {
    const newPages = [...pages];
    newPages[index] = event.target.value;
    setPages(newPages);
  };

  const addPageField = () => {
    setPages([...pages, '']);
  };

  const removePageField = (index) => {
    setPages(pages.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-full w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Screenshot Comparison</h1>

        {/* Centered Form Container */}
        <div className="flex justify-center">
          <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-lg">
            <div>
              <label htmlFor="url1" className="block text-sm font-medium text-gray-700">URL 1:</label>
              <input
                type="url"
                id="url1"
                name="url1"
                value={url1}
                onChange={(e) => setUrl1(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="url2" className="block text-sm font-medium text-gray-700">URL 2:</label>
              <input
                type="url"
                id="url2"
                name="url2"
                value={url2}
                onChange={(e) => setUrl2(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Additional Pages:</label>
              {pages.map((page, index) => (
                <div key={index} className="flex items-center space-x-4 mb-2">
                  <input
                    type="text"
                    placeholder={`Page ${index + 1}`}
                    value={page}
                    onChange={(e) => handlePageChange(index, e)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePageField(index)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPageField}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Page
              </button>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none font-semibold transition duration-200"
              >
                Compare URLs
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="w-1/4 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 focus:outline-none font-semibold transition duration-200"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* Result Section */}
        {result && (
          <div className="mt-8 border rounded-lg bg-gray-100 p-4">
            {result.results.map((result, index) => (
              <div key={index} className="mb-4">
                {result.dimensionMismatch ? (
                  <div>
                    <p className="text-lg text-red-600 font-semibold mt-4 text-center">
                      Dimension Mismatch Detected!
                    </p>
                    <p className="text-sm text-gray-700 text-center">
                      The screenshots have different dimensions.
                    </p>
                    <p className="text-sm text-gray-700 text-center">
                      URL 1 Dimensions: {result.dimensions1.width} x {result.dimensions1.height}
                    </p>
                    <p className="text-sm text-gray-700 text-center">
                      URL 2 Dimensions: {result.dimensions2.width} x {result.dimensions2.height}
                    </p>
                    <div className="flex justify-between items-center mt-4 space-x-4">
                      <div className="w-1/2 text-center">
                        <p className="mt-2 text-sm text-gray-600">Screenshot from URL 1</p>
                        <img src={`${result.screenshot1}?${new Date().getTime()}`} alt="Screenshot 1" className="h-auto w-full rounded-lg shadow-md" />
                      </div>
                      <div className="w-1/2 text-center">
                        <p className="mt-2 text-sm text-gray-600">Screenshot from URL 2</p>
                        <img src={`${result.screenshot2}?${new Date().getTime()}`} alt="Screenshot 2" className="h-auto w-full rounded-lg shadow-md" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg text-green-600 font-semibold mt-4 text-center">
                      Comparison complete!
                    </p>
                    <p className="text-sm text-gray-700 text-center">
                      Number of different pixels: {result.numDiffPixels}
                    </p>
                    <div className="flex justify-between items-center mt-4 space-x-4">
                      <div className="w-1/3 text-center">
                        <p className="mt-2 text-sm text-gray-600">Screenshot from URL 1</p>
                        <img src={`${result.screenshot1}?${new Date().getTime()}`} alt="Screenshot 1" className="h-auto w-full rounded-lg shadow-md" />
                      </div>
                      <div className="w-1/3 text-center">
                        <p className="mt-2 text-sm text-gray-600">Difference Image</p>
                        <img src={`${result.diffImage}?${new Date().getTime()}`} alt="Difference Image" className="h-auto w-full rounded-lg shadow-md" />
                      </div>
                      <div className="w-1/3 text-center">
                        <p className="mt-2 text-sm text-gray-600">Screenshot from URL 2</p>
                        <img src={`${result.screenshot2}?${new Date().getTime()}`} alt="Screenshot 2" className="h-auto w-full rounded-lg shadow-md" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error Section */}
        {error && (
          <div className="mt-8 border rounded-lg bg-gray-100 p-4">
            <p className="text-red-600 font-semibold">{`Error: ${error}`}</p>
          </div>
        )}
      </div>
    </div>
  );
}
