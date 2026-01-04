const admin = require('../config/firebase');
const db = admin.firestore();

const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required"
            });
        }

        // 1. Fetch User Document
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = userSnap.data();

        // 2. Fetch Farm Data (Optional step if you still need to check for a separate 'farms' collection)
        // If all data is already in the User doc, you might skip this. 
        // Keeping it for now as a fallback or enhancement if 'farms' collection exists.
        const farmsRef = db.collection('farms');
        const snapshot = await farmsRef.where('owner', '==', userId).limit(1).get();
        let farmData = null;
        if (!snapshot.empty) {
            farmData = snapshot.docs[0].data();
        }

        // 3. Process Data
        // Parse numbers from strings if necessary
        const userLat = parseFloat(userData.locationLat);
        const userLng = parseFloat(userData.locationLong);
        const userLand = parseFloat(userData.totalLand);

        let farmLocation = null;
        let acres = !isNaN(userLand) ? userLand : 0;

        // Determine Location: Priority to Farm Doc (if exists), else User Doc
        if (farmData && farmData.location) {
             // ... existing complex geometry logic for farmData ...
             // (Assuming simple case for brevity, expand if needed)
             if (farmData.location.lat && farmData.location.lng) {
                 farmLocation = { lat: Number(farmData.location.lat), lng: Number(farmData.location.lng) };
             }
        }

        // Fallback to User Doc location if Farm location not found
        if (!farmLocation && !isNaN(userLat) && !isNaN(userLng)) {
            farmLocation = {
                lat: userLat,
                lng: userLng
            };
        }

        res.json({
            success: true,
            data: {
                farmerName: userData.name,
                farmLocation: farmLocation,
                acres: acres,
                // Get first crop as primary, or empty string
                primaryCrop: (userData.crops && userData.crops.length > 0) ? userData.crops[0] : "",
                allCrops: userData.crops || [],
                phone: userData.phone,
                email: userData.email,
                firebaseUid: userData.uid
            }
        });

    } catch (error) {
        console.error("User Profile Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error: " + error.message
        });
    }
};

module.exports = { getUserProfile };