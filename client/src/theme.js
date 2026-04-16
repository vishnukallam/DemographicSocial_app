import { createTheme, alpha } from '@mui/material/styles';

// Material 3 Expressive Tonal Palettes (Approximated for Prototype)
// In a real M3 setup, we would generate these from a key color source.
const tonalPalettes = {
    blue: {
        primary: '#3b82f6',
        onPrimary: '#ffffff',
        primaryContainer: '#dbeafe',
        onPrimaryContainer: '#1e3a8a',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    green: {
        primary: '#22c55e',
        onPrimary: '#ffffff',
        primaryContainer: '#dcfce7',
        onPrimaryContainer: '#14532d',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    red: {
        primary: '#ef4444',
        onPrimary: '#ffffff',
        primaryContainer: '#fee2e2',
        onPrimaryContainer: '#7f1d1d',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    violet: {
        primary: '#8b5cf6',
        onPrimary: '#ffffff',
        primaryContainer: '#ddd6fe',
        onPrimaryContainer: '#4c1d95',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    orange: {
        primary: '#f97316',
        onPrimary: '#ffffff',
        primaryContainer: '#ffedd5',
        onPrimaryContainer: '#7c2d12',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
};

const getPaletteRaw = (color, mode) => {
    // Strict requirements: Light = Red, Dark = Purple
    if (mode === 'dark') {
        return {
            primary: {
                main: '#D0BCFF', // Purple 80
                contrastText: '#381E72', // Purple 10
            },
            secondary: {
                main: '#CCC2DC',
                contrastText: '#332D41',
            },
            background: {
                default: '#141218',
                paper: '#141218', // Consistent Dark
                surfaceContainer: '#231f29',
            },
            text: {
                primary: '#E6E1E5',
                secondary: '#CAC4D0',
            }
        };
    } else {
        return {
            primary: {
                main: '#be3627', // Red from secure_login_1
                contrastText: '#FFFFFF',
            },
            secondary: {
                main: '#5e413d', // Dark Red/Brown
                contrastText: '#FFFFFF',
            },
            background: {
                default: '#f8f6f6', // Light Grey from secure_login_1
                paper: '#ffffff',
                surfaceContainer: '#f2e9e9',
            },
            text: {
                primary: '#1a100f', // Dark from secure_login_1
                secondary: '#5e413d',
            }
        };
    }
};

export const getTheme = (mode = 'dark', accentColor = 'blue') => {
    const palette = getPaletteRaw(accentColor, mode);

    return createTheme({
        palette: {
            mode,
            ...palette
        },
        shape: {
            borderRadius: 12, // Reduced from 16
        },
        typography: {
            fontFamily: '"Roboto Flex", "Inter", sans-serif',
            h4: {
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
            },
            button: {
                textTransform: 'none',
                fontWeight: 650,
                letterSpacing: '0.01em'
            }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 12, // Reduced from 16
                        border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.04)',
                        boxShadow: mode === 'dark'
                            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 6, // Sharp but friendly
                        padding: '10px 24px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            transform: 'translateY(-1px)'
                        }
                    }
                }
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 6, // Sharp
                        }
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 6,
                    }
                }
            },
            MuiSlider: {
                styleOverrides: {
                    thumb: {
                        width: 20,
                        height: 20,
                        transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                        '&:before': {
                            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                        },
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)'}`,
                        },
                        '&.Mui-active': {
                            width: 24,
                            height: 24,
                        },
                    },
                }
            }
        }
    });
};
