//! # Responsibility
//! Template-based chord recognition from chromagram analysis.
//!
//! Matches chromagram pitch class distributions against predefined chord templates
//! to identify major, minor, diminished, augmented, and 7th chords.

use super::chromagram::Chromagram;

/// Chord quality types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChordQuality {
    Major,
    Minor,
    Diminished,
    Augmented,
    Dominant7,
    Major7,
    Minor7,
}

impl ChordQuality {
    /// Get semitone intervals from root for this chord quality
    pub fn intervals(&self) -> &'static [usize] {
        match self {
            ChordQuality::Major => &[0, 4, 7],           // Root, Major 3rd, Perfect 5th
            ChordQuality::Minor => &[0, 3, 7],           // Root, Minor 3rd, Perfect 5th
            ChordQuality::Diminished => &[0, 3, 6],      // Root, Minor 3rd, Diminished 5th
            ChordQuality::Augmented => &[0, 4, 8],       // Root, Major 3rd, Augmented 5th
            ChordQuality::Dominant7 => &[0, 4, 7, 10],   // Major triad + Minor 7th
            ChordQuality::Major7 => &[0, 4, 7, 11],      // Major triad + Major 7th
            ChordQuality::Minor7 => &[0, 3, 7, 10],      // Minor triad + Minor 7th
        }
    }

    pub fn name(&self) -> &'static str {
        match self {
            ChordQuality::Major => "maj",
            ChordQuality::Minor => "min",
            ChordQuality::Diminished => "dim",
            ChordQuality::Augmented => "aug",
            ChordQuality::Dominant7 => "7",
            ChordQuality::Major7 => "maj7",
            ChordQuality::Minor7 => "min7",
        }
    }
}

/// Detected chord with root and quality
#[derive(Debug, Clone, PartialEq)]
pub struct Chord {
    pub root: usize,              // Root pitch class (0-11)
    pub quality: ChordQuality,
    pub confidence: f32,          // Match confidence (0.0-1.0)
}

impl Chord {
    pub fn new(root: usize, quality: ChordQuality, confidence: f32) -> Self {
        Self {
            root: root % 12,
            quality,
            confidence,
        }
    }

    /// Get full chord name (e.g., "C maj", "A min", "F# dim")
    pub fn name(&self) -> String {
        format!("{} {}", Chromagram::pitch_class_name(self.root), self.quality.name())
    }
}

/// Chord recognition engine using template matching
pub struct ChordRecognizer {
    qualities: Vec<ChordQuality>,
    min_confidence: f32,
}

impl ChordRecognizer {
    /// Create new chord recognizer with specified chord qualities
    pub fn new(qualities: Vec<ChordQuality>, min_confidence: f32) -> Self {
        Self {
            qualities,
            min_confidence: min_confidence.clamp(0.0, 1.0),
        }
    }

    /// Create recognizer with standard chord qualities (maj, min, dim, aug, 7)
    pub fn with_standard_chords() -> Self {
        Self::new(
            vec![
                ChordQuality::Major,
                ChordQuality::Minor,
                ChordQuality::Diminished,
                ChordQuality::Augmented,
                ChordQuality::Dominant7,
            ],
            0.3, // 30% minimum confidence
        )
    }

    /// Recognize chord from chromagram
    ///
    /// # Arguments
    /// * `chromagram` - 12-bin pitch class distribution
    ///
    /// # Returns
    /// Best matching chord or None if confidence too low
    pub fn recognize(&self, chromagram: &Chromagram) -> Option<Chord> {
        let mut best_chord: Option<Chord> = None;
        let mut best_score = 0.0;

        // Try all 12 root notes
        for root in 0..12 {
            // Try all chord qualities
            for &quality in &self.qualities {
                let score = self.match_template(chromagram, root, quality);

                if score > best_score {
                    best_score = score;
                    best_chord = Some(Chord::new(root, quality, score));
                }
            }
        }

        // Filter by minimum confidence
        best_chord.filter(|c| c.confidence >= self.min_confidence)
    }

    /// Match chromagram against chord template using cosine similarity
    fn match_template(&self, chromagram: &Chromagram, root: usize, quality: ChordQuality) -> f32 {
        let intervals = quality.intervals();
        let mut template = [0.0f32; 12];

        // Build template: 1.0 for chord tones, 0.0 for non-chord tones
        for &interval in intervals {
            let pitch_class = (root + interval) % 12;
            template[pitch_class] = 1.0;
        }

        // Compute dot product
        let dot_product: f32 = chromagram
            .bins
            .iter()
            .zip(template.iter())
            .map(|(c, t)| c * t)
            .sum();

        // Compute magnitudes for cosine similarity
        let chroma_magnitude: f32 = chromagram.bins.iter().map(|c| c * c).sum::<f32>().sqrt();
        let template_magnitude: f32 = template.iter().map(|t| t * t).sum::<f32>().sqrt();

        // Cosine similarity (handles normalized chromagrams correctly)
        if chroma_magnitude > 0.0 && template_magnitude > 0.0 {
            dot_product / (chroma_magnitude * template_magnitude)
        } else {
            0.0
        }
    }

    pub fn min_confidence(&self) -> f32 {
        self.min_confidence
    }

    pub fn qualities(&self) -> &[ChordQuality] {
        &self.qualities
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use approx::assert_relative_eq;

    #[test]
    fn test_chord_quality_intervals() {
        assert_eq!(ChordQuality::Major.intervals(), &[0, 4, 7]);
        assert_eq!(ChordQuality::Minor.intervals(), &[0, 3, 7]);
        assert_eq!(ChordQuality::Diminished.intervals(), &[0, 3, 6]);
        assert_eq!(ChordQuality::Augmented.intervals(), &[0, 4, 8]);
    }

    #[test]
    fn test_chord_quality_names() {
        assert_eq!(ChordQuality::Major.name(), "maj");
        assert_eq!(ChordQuality::Minor.name(), "min");
        assert_eq!(ChordQuality::Dominant7.name(), "7");
    }

    #[test]
    fn test_chord_creation() {
        let chord = Chord::new(0, ChordQuality::Major, 0.85);
        assert_eq!(chord.root, 0);
        assert_eq!(chord.quality, ChordQuality::Major);
        assert_relative_eq!(chord.confidence, 0.85);
    }

    #[test]
    fn test_chord_root_wraparound() {
        let chord = Chord::new(14, ChordQuality::Minor, 0.7); // 14 % 12 = 2
        assert_eq!(chord.root, 2); // D
    }

    #[test]
    fn test_chord_name() {
        let c_major = Chord::new(0, ChordQuality::Major, 0.9);
        assert_eq!(c_major.name(), "C maj");

        let a_minor = Chord::new(9, ChordQuality::Minor, 0.8);
        assert_eq!(a_minor.name(), "A min");

        let f_sharp_dim = Chord::new(6, ChordQuality::Diminished, 0.7);
        assert_eq!(f_sharp_dim.name(), "F# dim");
    }

    #[test]
    fn test_chord_recognizer_creation() {
        let recognizer = ChordRecognizer::new(
            vec![ChordQuality::Major, ChordQuality::Minor],
            0.5,
        );
        assert_eq!(recognizer.qualities().len(), 2);
        assert_relative_eq!(recognizer.min_confidence(), 0.5);
    }

    #[test]
    fn test_chord_recognizer_standard_chords() {
        let recognizer = ChordRecognizer::with_standard_chords();
        assert!(recognizer.qualities().len() >= 5);
        assert!(recognizer.min_confidence() > 0.0);
    }

    #[test]
    fn test_recognize_c_major_perfect_match() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // Create perfect C major chromagram (C=0, E=4, G=7)
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 1.0; // C
        chroma.bins[4] = 1.0; // E
        chroma.bins[7] = 1.0; // G
        chroma.normalize();

        let result = recognizer.recognize(&chroma);
        assert!(result.is_some());
        
        let chord = result.unwrap();
        assert_eq!(chord.root, 0); // C
        assert_eq!(chord.quality, ChordQuality::Major);
        assert!(chord.confidence > 0.5);
    }

    #[test]
    fn test_recognize_a_minor() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // Create A minor chromagram (A=9, C=0, E=4)
        let mut chroma = Chromagram::new();
        chroma.bins[9] = 1.0; // A
        chroma.bins[0] = 1.0; // C
        chroma.bins[4] = 1.0; // E
        chroma.normalize();

        let result = recognizer.recognize(&chroma);
        assert!(result.is_some());
        
        let chord = result.unwrap();
        assert_eq!(chord.root, 9); // A
        assert_eq!(chord.quality, ChordQuality::Minor);
    }

    #[test]
    fn test_recognize_no_match_below_threshold() {
        let recognizer = ChordRecognizer::new(
            vec![ChordQuality::Major],
            0.9, // Very high threshold
        );
        
        // Weak signal
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 0.1;
        chroma.bins[4] = 0.1;
        chroma.normalize();

        let result = recognizer.recognize(&chroma);
        assert!(result.is_none()); // Below threshold
    }

    #[test]
    fn test_recognize_silence_returns_none() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        let chroma = Chromagram::new(); // All zeros
        
        let result = recognizer.recognize(&chroma);
        assert!(result.is_none());
    }

    #[test]
    fn test_match_template_perfect_correlation() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // Perfect C major template
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 1.0;
        chroma.bins[4] = 1.0;
        chroma.bins[7] = 1.0;
        chroma.normalize();

        let score = recognizer.match_template(&chroma, 0, ChordQuality::Major);
        assert!(score > 0.8); // High correlation
    }

    #[test]
    fn test_match_template_no_correlation() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // C major chromagram vs F# major template (tritone apart, no overlap)
        let mut chroma = Chromagram::new();
        chroma.bins[0] = 1.0; // C
        chroma.bins[4] = 1.0; // E
        chroma.bins[7] = 1.0; // G
        chroma.normalize();

        let score = recognizer.match_template(&chroma, 6, ChordQuality::Major); // F#
        assert!(score < 0.2); // Low correlation
    }

    #[test]
    fn test_dominant_7_chord_recognition() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // G7 chord: G=7, B=11, D=2, F=5
        let mut chroma = Chromagram::new();
        chroma.bins[7] = 1.0;  // G
        chroma.bins[11] = 1.0; // B
        chroma.bins[2] = 1.0;  // D
        chroma.bins[5] = 1.0;  // F
        chroma.normalize();

        let result = recognizer.recognize(&chroma);
        assert!(result.is_some());
        
        let chord = result.unwrap();
        assert_eq!(chord.root, 7); // G
        assert_eq!(chord.quality, ChordQuality::Dominant7);
    }

    #[test]
    fn test_diminished_chord_recognition() {
        let recognizer = ChordRecognizer::with_standard_chords();
        
        // B diminished: B=11, D=2, F=5
        let mut chroma = Chromagram::new();
        chroma.bins[11] = 1.0; // B
        chroma.bins[2] = 1.0;  // D
        chroma.bins[5] = 1.0;  // F
        chroma.normalize();

        let result = recognizer.recognize(&chroma);
        assert!(result.is_some());
        
        let chord = result.unwrap();
        assert_eq!(chord.root, 11); // B
        assert_eq!(chord.quality, ChordQuality::Diminished);
    }

    #[test]
    fn test_confidence_clamping() {
        let recognizer = ChordRecognizer::new(vec![ChordQuality::Major], 1.5); // Invalid
        assert_relative_eq!(recognizer.min_confidence(), 1.0); // Clamped to 1.0
    }
}
