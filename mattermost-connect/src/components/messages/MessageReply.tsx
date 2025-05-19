import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';

export const MessageReply = ({message, handleClose}) => {

    if(!message) return null
  return (
    <Box
            sx={{
              p: 2,
              borderColor: "divider",
              zIndex: 10,
            }}
          >
        <Box
          sx={{
            width: '100%', 
            p: 2,
            pt: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            borderRadius: 2,
            borderLeft: "4px solid",
            borderColor: "primary.main",
            bgcolor: "action.hover",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" component={"div"}>
              Replying to {message.message}
            </Typography>
            
            <IconButton

                sx={{ cursor: "pointer" }}
                onClick={handleClose}
            >
                <CloseIcon />
            </IconButton>
            
          </Box>
        </Box>
        </Box>
  )
};

