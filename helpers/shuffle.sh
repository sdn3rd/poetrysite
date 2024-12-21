#!/bin/bash

# Variables
AUDIO_DIR="/Users/joebanks/git/patrick/audio/"   # Path to the audio files
JSON_DIR="/Users/joebanks/git/patrick/"     # Path to the JSON files
FILE_EXTENSION="m4a"                    # Audio file extension
START_DATE=7                            # Starting date (inclusive)
END_DATE=16                             # Ending date (inclusive)
MONTH_EN="November"
MONTH_IT="Novembre"
YEAR="2024"

# Loop from END_DATE down to START_DATE
for (( i=END_DATE; i>=START_DATE; i-- )); do
    NEW_DATE=$((i + 1))

    # Format dates with leading zeros if necessary
    OLD_DATE_EN="${i} ${MONTH_EN} ${YEAR}"
    NEW_DATE_EN="${NEW_DATE} ${MONTH_EN} ${YEAR}"
    OLD_DATE_IT="${i} ${MONTH_IT} ${YEAR}"
    NEW_DATE_IT="${NEW_DATE} ${MONTH_IT} ${YEAR}"

    # Update JSON files
    JSON_FILE="${JSON_DIR}/${i}_${MONTH_EN}_${YEAR}.json"
    if [[ -f "${JSON_FILE}" ]]; then
        # Read the JSON content
        JSON_CONTENT=$(cat "${JSON_FILE}")
        # Update the dates in the JSON content
        UPDATED_JSON=$(echo "${JSON_CONTENT}" | sed -e "s/\"date_en\": \".*\"/\"date_en\": \"${NEW_DATE_EN}\"/" \
                                                    -e "s/\"date_it\": \".*\"/\"date_it\": \"${NEW_DATE_IT}\"/")
        # Save the updated JSON content back to the file
        echo "${UPDATED_JSON}" > "${JSON_FILE}"
    else
        echo "JSON file ${JSON_FILE} does not exist."
    fi

    # Move audio files
    OLD_AUDIO_FILE="${AUDIO_DIR}/${i}_${MONTH_EN}_${YEAR}.${FILE_EXTENSION}"
    NEW_AUDIO_FILE="${AUDIO_DIR}/${NEW_DATE}_${MONTH_EN}_${YEAR}.${FILE_EXTENSION}"
    if [[ -f "${OLD_AUDIO_FILE}" ]]; then
        mv "${OLD_AUDIO_FILE}" "${NEW_AUDIO_FILE}"
    else
        echo "Audio file ${OLD_AUDIO_FILE} does not exist."
    fi
done
