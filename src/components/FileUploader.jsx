function FileUploader({ onFileLoaded }) {
    // This function handles when a file is selected
    const handleFileChange = (event) => {
      // Get the first file from the selection (we only need one CSV)
      const file = event.target.files[0];
      if (!file) return;
      
      // Check if the file is a CSV
      if (!file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      
      // Create a FileReader to read the file contents
      const reader = new FileReader();
      
      // Set up what happens when the file is loaded
      reader.onload = (e) => {
        // e.target.result contains the file contents as text
        const csvContent = e.target.result;
        
        // Pass the contents to the parent component
        onFileLoaded(csvContent);
      };
      
      // Handle errors during file reading
      reader.onerror = () => {
        console.error('Error reading file');
        alert('There was an error reading the file');
      };
      
      // Start reading the file as text
      reader.readAsText(file);
    };
    
    return (
      <div className="p-4 border-2 border-dashed border-gray-300 rounded-md mb-4">
        <label className="block mb-2 font-medium text-sm text-gray-700">
          Upload your database schema CSV file
        </label>
        
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
        />
        
        <p className="mt-2 text-xs text-gray-500">
          The CSV should contain the table structure with columns for table name, schema, 
          column name, primary keys, and foreign keys.
        </p>
      </div>
    );
  }