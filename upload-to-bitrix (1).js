// api/upload-to-bitrix.js
// Vercel Serverless Function to upload files to XHERIS system

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files, dealId, webhook, fileField } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!dealId) {
      return res.status(400).json({ error: 'No deal ID provided' });
    }

    if (!webhook || !fileField) {
      return res.status(400).json({ error: 'Missing configuration' });
    }

    console.log(`📎 Processing ${files.length} files for request #${dealId}`);
    console.log(`📎 Using field: ${fileField}`);

    // Convert files to proper format for Bitrix24
    const filesArray = files.map(f => [f.name, f.data]);

    try {
      // Update the deal with files
      console.log(`📎 Updating request with ${filesArray.length} files...`);

      const updateResponse = await fetch(`${webhook}crm.deal.update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: dealId,
          fields: {
            [fileField]: filesArray
          }
        })
      });

      const updateResult = await updateResponse.json();
      
      console.log('Update response:', updateResult);

      if (updateResult.result) {
        console.log(`✅ Successfully attached ${files.length} file(s)`);
        
        return res.status(200).json({
          success: true,
          uploaded: files.length,
          files: files.map(f => ({ name: f.name, size: f.size }))
        });
      } else {
        console.error('Update failed:', updateResult);
        return res.status(500).json({
          success: false,
          error: updateResult.error_description || 'Upload failed'
        });
      }

    } catch (error) {
      console.error('❌ Error uploading files:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
