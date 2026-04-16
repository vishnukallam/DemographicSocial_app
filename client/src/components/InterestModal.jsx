import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateInterests } from '../store/authSlice';
import { Dialog, DialogTitle, DialogContent, Box, TextField, Button, Autocomplete, Chip, Typography } from '@mui/material';
import api from '../utils/api';

const InterestModal = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [availableInterests, setAvailableInterests] = useState([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (user && (!user.interests || user.interests.length === 0)) {
            setOpen(true);
        } else {
            setOpen(false);
        }
    }, [user]);

    useEffect(() => {
        const fetchInterests = async () => {
            try {
                // Use the configured api instance which handles base URL and headers
                const res = await api.get('/api/interests');
                setAvailableInterests(res.data);
            } catch (err) {
                console.error("Failed to load interests", err);
            }
        };
        fetchInterests();
    }, []);

    const handleSubmit = () => {
        if (selectedInterests.length > 0) {
            // Interests are now flat strings from the API
            dispatch(updateInterests(selectedInterests));
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} disableEscapeKeyDown>
            <DialogTitle>Select Your Interests</DialogTitle>
            <DialogContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    You must select at least one interest to see nearby hotspots.
                </Typography>
                <Box component="form" sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Autocomplete
                        multiple
                        options={availableInterests}
                        getOptionLabel={(option) => option}
                        value={selectedInterests}
                        onChange={(event, newValue) => {
                            setSelectedInterests(newValue);
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Interests" placeholder="Interests" />
                        )}
                        renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                                <Chip label={option} {...getTagProps({ index })} />
                            ))
                        }
                    />
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={selectedInterests.length === 0}
                    >
                        Start Exploring
                    </Button>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default InterestModal;
