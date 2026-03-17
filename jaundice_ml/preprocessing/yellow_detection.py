"""Yellow color detection for jaundice indication in skin images."""
import logging
import cv2
import numpy as np
from typing import Tuple

logger = logging.getLogger(__name__)


def detect_yellow_tint(image: np.ndarray) -> float:
    """
    Detect yellow tint in skin image to indicate potential jaundice.
    
    Args:
        image: RGB image as numpy array
        
    Returns:
        float: Yellow detection score between 0-1, where higher values indicate more yellow
    """
    try:
        hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)

        # More conservative yellow range to reduce false positives
        lower_yellow = np.array([20, 80, 60], dtype=np.uint8)  # More restrictive
        upper_yellow = np.array([35, 200, 200], dtype=np.uint8)  # More restrictive
        yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow) > 0

        skin_mask = create_skin_mask(image)
        if np.any(skin_mask):
            yellow_ratio = float(np.sum(yellow_mask & skin_mask) / np.sum(skin_mask))
            b_channel_skin = lab[:, :, 2][skin_mask]
        else:
            yellow_ratio = float(np.mean(yellow_mask))
            b_channel_skin = lab[:, :, 2].reshape(-1)

        # LAB B channel is centered near 128 in OpenCV.
        # Values above ~135 suggest yellow bias.
        b_mean = float(np.mean(b_channel_skin)) if b_channel_skin.size else 128.0
        b_bias = float(np.clip((b_mean - 135.0) / 35.0, 0.0, 1.0))

        final_score = float(np.clip(0.75 * yellow_ratio + 0.25 * b_bias, 0.0, 1.0))
        return final_score

    except Exception as e:
        logger.warning(f"Yellow tint detection failed: {e}")
        return 0.0


def create_skin_mask(image: np.ndarray) -> np.ndarray:
    """
    Create a mask to detect skin regions in the image.
    
    Args:
        image: RGB image as numpy array
        
    Returns:
        np.ndarray: Binary mask where 1 indicates skin
    """
    try:
        # Convert to YCrCb color space for better skin detection
        ycrcb = cv2.cvtColor(image, cv2.COLOR_RGB2YCrCb)
        
        # Skin detection ranges in YCrCb
        # Y: 0-255, Cr: 133-173, Cb: 77-127
        lower_skin = np.array([0, 133, 77], dtype=np.uint8)
        upper_skin = np.array([255, 173, 127], dtype=np.uint8)
        
        skin_mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
        
        # Apply morphological operations to clean up the mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel)
        skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_CLOSE, kernel)
        
        return skin_mask > 0
        
    except Exception as e:
        logger.warning(f"Skin mask creation failed: {e}")
        return np.zeros(image.shape[:2], dtype=bool)


def analyze_yellow_distribution(image: np.ndarray) -> dict:
    """
    Analyze the distribution of yellow in different regions of the image.
    
    Args:
        image: RGB image as numpy array
        
    Returns:
        dict: Analysis results with regional yellow scores
    """
    try:
        height, width = image.shape[:2]
        
        # Divide image into regions
        regions = {
            'upper_left': image[:height//2, :width//2],
            'upper_right': image[:height//2, width//2:],
            'lower_left': image[height//2:, :width//2],
            'lower_right': image[height//2:, width//2:],
            'center': image[height//4:3*height//4, width//4:3*width//4]
        }
        
        results = {}
        for region_name, region_image in regions.items():
            if region_image.size > 0:
                results[region_name] = detect_yellow_tint(region_image)
            else:
                results[region_name] = 0.0
        
        # Calculate overall statistics
        scores = list(results.values())
        results['mean_yellow'] = np.mean(scores)
        results['max_yellow'] = np.max(scores)
        results['min_yellow'] = np.min(scores)
        results['std_yellow'] = np.std(scores)
        
        return results
        
    except Exception as e:
        logger.warning(f"Yellow distribution analysis failed: {e}")
        return {
            'mean_yellow': 0.0,
            'max_yellow': 0.0,
            'min_yellow': 0.0,
            'std_yellow': 0.0
        }


def get_jaundice_indication(yellow_score: float) -> Tuple[str, str]:
    """
    Get jaundice indication based on yellow score.
    
    Args:
        yellow_score: Yellow detection score (0-1)
        
    Returns:
        Tuple[str, str]: (indication_level, description)
    """
    if yellow_score < 0.2:
        return "Low", "No significant yellow tint detected"
    elif yellow_score < 0.4:
        return "Moderate", "Mild yellow tint present - monitor closely"
    elif yellow_score < 0.6:
        return "High", "Significant yellow tint detected - medical consultation recommended"
    else:
        return "Very High", "Strong yellow tint - immediate medical attention recommended"
